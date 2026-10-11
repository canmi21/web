/**
 * Space in development: each part's own development server, and the router in front of them in
 * workerd with the bindings it has in production, each bound to its part's server instead of its
 * Worker. Read at http://localhost:26528. See spec/architecture/space.md.
 */
import { spawn, type ChildProcess } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import * as esbuild from 'esbuild';
import { Miniflare, type MiniflareOptions } from 'miniflare';
import { PARTS } from '../src/parts.ts';

const HERE = fileURLToPath(new URL('..', import.meta.url));
/** Each part's pinned development port, as its own vite.config.ts pins it. */
const PORTS: Record<keyof typeof PARTS, number> = { design: 26550, rfcs: 26551 };
const PORT = 26528;

/** Each in a process group of its own, so stopping it stops the server pnpm started too. */
const servers: ChildProcess[] = Object.keys(PARTS).map((part) =>
	spawn('pnpm', ['run', 'dev'], { cwd: `${HERE}${part}`, stdio: 'inherit', detached: true }),
);
const stop = () => {
	for (const server of servers) if (server.pid) process.kill(-server.pid, 'SIGTERM');
	process.exit();
};
process.on('SIGINT', stop);
process.on('SIGTERM', stop);

/**
 * A part's binding: workerd itself speaking HTTP to its development server, as it speaks to the
 * part's Worker in production, with no process of ours in between.
 */
const bound = (port: number) =>
	({ type: 'external', address: `localhost:${port}`, http: {} }) as const;

let miniflare: Miniflare | undefined;

const context = await esbuild.context({
	entryPoints: [`${HERE}src/index.ts`],
	bundle: true,
	format: 'esm',
	platform: 'neutral',
	conditions: ['workerd', 'worker', 'browser'],
	mainFields: ['module', 'main'],
	write: false,
	plugins: [
		{
			name: 'reload-router',
			setup(build) {
				build.onEnd(async (result) => {
					const script = result.outputFiles?.[0]?.text;
					if (!script) return;
					const options: MiniflareOptions = {
						port: PORT,
						workers: [
							{
								config: {
									name: 'space',
									compatibilityDate: '2026-07-29',
									manifest: {
										mainModule: 'index.js',
										modules: { 'index.js': { type: 'esm', contents: script } },
									},
									env: {
										DEV: { type: 'text', value: '1' },
										...Object.fromEntries(
											Object.entries(PARTS).map(([part, binding]) => [
												binding,
												bound(PORTS[part as keyof typeof PARTS]),
											]),
										),
									},
								},
							},
						],
					};
					if (miniflare) await miniflare.setOptions(options);
					else {
						miniflare = new Miniflare(options);
						console.log(`space: http://localhost:${PORT}`);
					}
				});
			},
		},
	],
});
await context.watch();
