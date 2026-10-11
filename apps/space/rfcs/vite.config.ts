import adapter from '@sveltejs/adapter-cloudflare';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';
import { fileURLToPath } from 'node:url';
import stylex from '@stylexjs/unplugin/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';
import { pickUrls } from '@monoflake/sdk';
import { buildDefine } from '@canmi/web/build';
import { pluginOptions, sourcemapSetting, uploadsSourceMaps } from '@canmi/web/sentry/build';
import { sentrySvelteKit } from '@sentry/sveltekit/vite';
import { stylexUnderBase } from '@canmi/space-ui/vite';

/** This part's path on canmi.app; see spec/architecture/space.md. */
const BASE = '/rfcs';

// The repository root, as the site and the console set it: StyleX hashes a class from the file's
// path relative to this.
const ROOT = fileURLToPath(new URL('../../../', import.meta.url));
const RFCS = fileURLToPath(new URL('../../../../rfcs/', import.meta.url));

// Sentry's plugin hands its browser half the `$app/state` tracing SvelteKit 3 needs, as the
// console's does; maps upload only with a token. See spec/architecture/space.md, "Errors are the
// console's".
const upload = uploadsSourceMaps(process.env);
const stylexPlugin = stylex({
	useCSSLayers: true,
	unstable_moduleResolution: { type: 'commonJS', rootDir: ROOT },
	lightningcssOptions: { minify: true },
});

export default defineConfig(({ mode }) => ({
	// The commit, the build moment and the disclosure; see lib's spec/web/build.md.
	define: buildDefine(fileURLToPath(new URL('.', import.meta.url))),
	// Its own pinned port, refused rather than moved when taken; see spec/toolchain.md, "Dev ports
	// are pinned". Read through space's router at 26528, so the page's hot updates come straight
	// here rather than through it.
	// The RFCs are read from the rfcs repository beside web's checkout, outside the workspace Vite
	// would serve from otherwise; see RFC 7f4xx.
	server: {
		port: 26551,
		strictPort: true,
		hmr: { clientPort: 26551 },
		fs: { allow: [ROOT, RFCS] },
	},
	plugins: [
		{
			// The font stylesheets in @canmi/fonts name their host by a placeholder, which mode
			// decides: the CDN, or the local gateway in development.
			name: 'replace-cdn-url',
			transform(code: string, id: string) {
				if (!/\.css($|\?)/.test(id) || !code.includes('__CDN_URL__')) return null;
				return code.replaceAll('__CDN_URL__', pickUrls(mode !== 'production').cdn);
			},
		},
		tailwindcss(),
		sentrySvelteKit(
			pluginOptions({
				project: 'space',
				upload,
				env: process.env,
				mapsToDelete: ['.svelte-kit/output/**/*.map'],
			}),
		),
		sveltekit({
			preprocess: vitePreprocess(),
			compilerOptions: { runes: true },
			// Rendered in the Worker, a page prerendered where it says so; see
			// spec/architecture/space.md, "Rendered on request, prerendered by choice".
			adapter: adapter(),
			// Absolute even in a page rendered on the server, since behind the router a page's own
			// address is not where a relative one would be read from.
			paths: { base: BASE, relative: false },
		}),
		stylexUnderBase(BASE),
		{
			// After the Svelte compiler, not before it; see spec/architecture/css/layers.md, "The build
			// order is the opposite of what StyleX documents".
			...stylexPlugin,
			enforce: undefined,
			// SvelteKit owns the HTML shell; +layout.svelte injects these two dev assets itself.
			transformIndexHtml: undefined,
		},
	],
	build: {
		target: 'es2023',
		sourcemap: sourcemapSetting(upload),
		rollupOptions: { output: { hashCharacters: 'hex' } },
	},
}));
