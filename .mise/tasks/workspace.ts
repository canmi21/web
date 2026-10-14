/**
 * The workspace this repository is cloned inside, and the task libraries it holds for every
 * repository: reached by position, two directories up, and failing by name when it is not there,
 * as `refs` reaches refs_check.py. See the workspace's spec/architecture/repos.md, "A rule that is
 * code inherits the same way, as a module the projects import".
 */
import { existsSync, realpathSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import type * as Graph from '../../../../.mise/tasks/change/graph.ts';

/** This repository's root. */
export const ROOT = realpathSync(fileURLToPath(new URL('../..', import.meta.url)));
const WORKSPACE = resolve(ROOT, '../..');

/** The workspace's task library at `path` under its `.mise/tasks`, as a URL to import. */
export function shared(path: string): string {
	const file = join(WORKSPACE, '.mise/tasks', path);
	if (!existsSync(file)) {
		console.error(
			`the shared task library is not at ${file}\n` +
				'  A project is cloned inside the workspace that holds it, and this one is not.',
		);
		process.exit(1);
	}
	return pathToFileURL(file).href;
}

/**
 * Where its apps and packages are: `apps/` for what is deployed, `libs/` for what is imported, and
 * `apps/space/*` canmi.app's parts, each an app of its own behind space's router.
 */
export const LAYOUT: Graph.Layout = {
	root: ROOT,
	packageDirectories: ['apps/*', 'apps/space/*', 'libs/*'],
	appRoots: ['apps'],
};
