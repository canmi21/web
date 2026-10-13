/**
 * The check spec/console/polish.md asks for: every `<Unpolished rfc>` names an RFC of the console's
 * that exists and is still open, and an unpolished surface writes no style of its own. A surface's
 * own files are those holding a mark, and what only they reach outside the shared components, in
 * SHARED; what the shell, a polished page or anything unmarked imports is not the surface's. A
 * style is `stylex.create`, a `class` or `style` attribute or directive, or a `<style>` block. The
 * files styled when they were marked keep exactly as many styles as they had, in STYLED, so none
 * is added and one taken out is said.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const CONSOLE = fileURLToPath(new URL('..', import.meta.url));
const SOURCE = join(CONSOLE, 'src');
/** Beside this repository in the workspace, as every project is. */
const RFCS = resolve(CONSOLE, '../../../rfcs');

/**
 * The console's shared components, never a surface's own whoever uses it: a file directly in
 * `src/lib`, or under one of these. The mark is one, so its tag is no surface's style.
 */
export const SHARED = ['src/lib/ui/', 'src/lib/design/', 'src/lib/table/', 'src/lib/chart/'];

const isShared = (path: string) =>
	/^src\/lib\/[^/]+$/.test(path) || SHARED.some((one) => path.startsWith(one));

/**
 * Styles each page had when it was marked, by path under the console, as counted by `styleSites`:
 * held exactly, so no style is added inside a marked page and one taken out is written down here.
 */
export const STYLED: Readonly<Record<string, number>> = {
	'src/lib/apps/app-name.svelte': 3,
	'src/lib/apps/database-panel.svelte': 31,
	'src/lib/apps/history-table.svelte': 1,
	'src/lib/apps/node-chip.svelte': 4,
	'src/lib/apps/rollout-tag.svelte': 1,
	'src/lib/apps/usage-charts.svelte': 2,
	'src/lib/deployments/events.svelte': 2,
	'src/lib/deployments/matrix.svelte': 4,
	'src/lib/deployments/progress.svelte': 5,
	'src/lib/deployments/queue.svelte': 1,
	'src/lib/events/events-table.svelte': 4,
	'src/lib/events/filters.svelte': 10,
	'src/lib/nodes/node-apps.svelte': 1,
	'src/lib/nodes/node-disk.svelte': 3,
	'src/lib/nodes/node-events.svelte': 4,
	'src/lib/nodes/node-header.svelte': 7,
	'src/lib/nodes/node-overview.svelte': 4,
	'src/lib/nodes/nodes-table.svelte': 4,
	'src/lib/overview/fleet-charts.svelte': 3,
	'src/routes/[[scope=scope]]/apps/+page.svelte': 5,
	'src/routes/[[scope=scope]]/apps/[app]/+page.svelte': 12,
	'src/routes/[[scope=scope]]/deployments/+page.svelte': 5,
	'src/routes/[[scope=scope]]/deployments/[run]/+page.svelte': 7,
	'src/routes/[[scope=scope]]/events/+page.svelte': 6,
	'src/routes/[[scope=scope]]/nodes/+page.svelte': 3,
	'src/routes/[[scope=scope]]/nodes/[node]/+page.svelte': 7,
};

/** An RFC still waiting, which a mark may cite. */
const OPEN = new Set(['draft', 'accepted']);

export interface Rfc {
	/** Its directory under the RFCs, its scope. */
	readonly scope: string;
	readonly status: string;
}

export interface Problem {
	readonly file: string;
	readonly message: string;
}

const MARKS = /<Unpolished\b([^>]*)>/g;
const RFC = /\brfc="([a-z0-9]+)"/;

/** The RFC ids a file's marks cite, and a mark citing none by a literal id as `undefined`. */
export function marksIn(source: string): (string | undefined)[] {
	return [...source.matchAll(MARKS)].map((one) => RFC.exec(one[1] ?? '')?.[1]);
}

const SCRIPT = /<script\b[^>]*>[\s\S]*?<\/script>/g;
const COMMENT = /<!--[\s\S]*?-->/g;
const ATTRIBUTE = /(?<![\w-])(?:class|style)(?:=|:[\w-])/g;
const BLOCK = /<style[\s>]/g;
const CREATE = /\bstylex\.create\(/g;

const count = (text: string, pattern: RegExp) => text.match(pattern)?.length ?? 0;

/** How many styles `source` writes of its own, by the rule above. */
export function styleSites(path: string, source: string): number {
	const created = count(source, CREATE);
	if (!path.endsWith('.svelte')) return created;
	const markup = source.replace(SCRIPT, '').replace(COMMENT, '');
	return created + count(markup, ATTRIBUTE) + count(markup, BLOCK);
}

const IMPORT = /(?:\bfrom\s*|\bimport\s*\(?\s*)'([^']+)'/g;

/** The console's files `path` imports, by path under the console; packages are left out. */
export function importsOf(
	path: string,
	source: string,
	exists: (path: string) => boolean,
): string[] {
	const found: string[] = [];
	for (const [, specifier = ''] of source.matchAll(IMPORT)) {
		let target: string;
		if (specifier.startsWith('#lib/')) target = join('src/lib', specifier.slice('#lib/'.length));
		else if (specifier.startsWith('.')) target = join(dirname(path), specifier);
		else continue;
		const asTs = target.replace(/\.js$/, '.ts');
		if (exists(target)) found.push(target);
		else if (asTs !== target && exists(asTs)) found.push(asTs);
	}
	return found;
}

/** What `start` reaches through `edges`, not going on past a file `stop` holds. */
function reach(
	start: Iterable<string>,
	edges: Map<string, string[]>,
	stop: (file: string) => boolean,
) {
	const seen = new Set<string>();
	const queue = [...start];
	for (let file = queue.pop(); file !== undefined; file = queue.pop()) {
		if (seen.has(file)) continue;
		seen.add(file);
		if (stop(file)) continue;
		queue.push(...(edges.get(file) ?? []));
	}
	return seen;
}

/** Each unpolished surface's own files: the marked, and what only they reach but the shared. */
export function surfaceFiles(files: ReadonlyMap<string, string>): Set<string> {
	const exists = (path: string) => files.has(path);
	const edges = new Map(
		[...files].map(([path, source]) => [path, importsOf(path, source, exists)]),
	);
	const marked = new Set([...files].filter(([, source]) => marksIn(source).length).map(([p]) => p));
	const entries = [...files.keys()].filter(
		(path) =>
			(path.startsWith('src/routes/') || /^src\/[^/]+\.ts$/.test(path)) && !marked.has(path),
	);
	// Reached without passing through a mark: shared, whatever else reaches it.
	const shared = reach(entries, edges, (file) => marked.has(file));
	for (const file of marked) shared.delete(file);
	const own = reach(marked, edges, () => false);
	for (const file of own)
		if (shared.has(file) || (isShared(file) && !marked.has(file))) own.delete(file);
	return own;
}

/** Everything wrong with `files` by polish.md, against the RFCs `known` and the baseline. */
export function check(
	files: ReadonlyMap<string, string>,
	known: ReadonlyMap<string, Rfc>,
	styled: Readonly<Record<string, number>> = STYLED,
): Problem[] {
	const problems: Problem[] = [];
	for (const [file, source] of files) {
		for (const id of marksIn(source)) {
			const rfc = id === undefined ? undefined : known.get(id);
			if (id === undefined) problems.push({ file, message: 'a mark names no RFC by a literal id' });
			else if (!rfc) problems.push({ file, message: `cites RFC ${id}, which does not exist` });
			else if (rfc.scope !== 'console')
				problems.push({
					file,
					message: `cites RFC ${id}, which is ${rfc.scope}'s, not the console's`,
				});
			else if (!OPEN.has(rfc.status))
				problems.push({ file, message: `cites RFC ${id}, which is ${rfc.status}` });
		}
	}
	const own = surfaceFiles(files);
	for (const file of [...own].toSorted()) {
		const sites = styleSites(file, files.get(file) ?? '');
		const held = styled[file];
		if (held === undefined && sites > 0)
			problems.push({ file, message: `writes ${sites} style(s) inside an unpolished surface` });
		else if (held !== undefined && sites > held)
			problems.push({
				file,
				message: `writes ${sites - held} style(s) more than when it was marked`,
			});
		else if (held !== undefined && sites < held)
			problems.push({ file, message: `writes ${sites} style(s); lower STYLED to ${sites}` });
	}
	for (const file of Object.keys(styled))
		if (!own.has(file))
			problems.push({ file, message: 'is in STYLED and in no unpolished surface; take it out' });
	return problems;
}

/** The console's sources, tests and generated files left out, by path under the console. */
function sources(): Map<string, string> {
	const out = new Map<string, string>();
	const walk = (directory: string) => {
		for (const name of readdirSync(directory)) {
			const path = join(directory, name);
			if (statSync(path).isDirectory()) walk(path);
			else if (/\.(svelte|ts|js)$/.test(name) && !name.endsWith('.test.ts'))
				out.set(relative(CONSOLE, path), readFileSync(path, 'utf8'));
		}
	};
	walk(SOURCE);
	return out;
}

/** Every RFC by its id, the last word of its file's name, with its scope and status. */
function rfcs(): Map<string, Rfc> {
	const out = new Map<string, Rfc>();
	for (const scope of readdirSync(RFCS)) {
		const directory = join(RFCS, scope);
		if (scope.startsWith('.') || !statSync(directory).isDirectory()) continue;
		for (const name of readdirSync(directory)) {
			const id = /-([a-z0-9]+)\.md$/.exec(name)?.[1];
			if (!id) continue;
			const text = readFileSync(join(directory, name), 'utf8');
			out.set(id, { scope, status: /^status:\s*(\S+)/m.exec(text)?.[1] ?? 'unknown' });
		}
	}
	return out;
}

if (import.meta.main) {
	try {
		statSync(RFCS);
	} catch {
		console.error(`polish: the RFCs are not at ${RFCS}; clone them beside this repository`);
		process.exit(1);
	}
	const files = sources();
	const problems = check(files, rfcs());
	for (const { file, message } of problems) console.error(`apps/console/${file}: ${message}`);
	const marks = [...files.values()].reduce((sum, source) => sum + marksIn(source).length, 0);
	console.log(`polish: ${marks} mark(s), ${surfaceFiles(files).size} surface file(s)`);
	process.exit(problems.length ? 1 : 0);
}
