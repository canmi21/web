/**
 * The RFCs on disk under the repository's rfcs/, each with its scope and its parsed name, the
 * areas rfcs/scopes.yaml lists, and whatever under rfcs/ is neither. Read by `new-rfc` and
 * `check-rfc`.
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'yaml';
import { parseName, type Name } from '../src/lib/rfc/name.ts';

export const ROOT = fileURLToPath(new URL('../../../../', import.meta.url));
export const RFCS = join(ROOT, 'rfcs');
const SCOPES = 'scopes.yaml';

/** Each area's name and what it is about, as rfcs/scopes.yaml lists them. */
export function scopes(): Map<string, string> {
	const path = join(RFCS, SCOPES);
	if (!existsSync(path)) return new Map();
	const listed = (parse(readFileSync(path, 'utf8')) ?? {}) as Record<string, unknown>;
	return new Map(Object.entries(listed).map(([name, about]) => [name, String(about)]));
}

export type RfcFile = Name & { scope: string; path: string };

export function rfcFiles(): { files: RfcFile[]; strays: string[] } {
	const files: RfcFile[] = [];
	const strays: string[] = [];
	if (!existsSync(RFCS)) return { files, strays };
	for (const scope of readdirSync(RFCS).toSorted()) {
		const folder = join(RFCS, scope);
		if (scope === SCOPES) continue;
		if (!statSync(folder).isDirectory()) {
			strays.push(relative(ROOT, folder));
			continue;
		}
		for (const file of readdirSync(folder).toSorted()) {
			const path = join(folder, file);
			const name = statSync(path).isFile() ? parseName(file) : undefined;
			if (name) files.push({ ...name, scope, path });
			else strays.push(relative(ROOT, path));
		}
	}
	return { files, strays };
}
