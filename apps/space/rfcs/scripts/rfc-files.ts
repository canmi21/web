/**
 * The RFCs on disk in the rfcs repository beside this one, each with its scope and its parsed
 * name, the areas its scopes.yaml lists, and whatever in it is neither. Read by `new-rfc` and
 * `check-rfc`; see RFC 7f4xx.
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'yaml';
import { parseName, type Name } from '../src/lib/rfc/name.ts';

/** The rfcs repository, a sibling of web's checkout in the workspace's repos/. */
export const RFCS = fileURLToPath(new URL('../../../../../rfcs/', import.meta.url));
export const SCOPES = 'scopes.yaml';
/** What the repository keeps at its root besides its areas: documents and their few settings. */
const OWN = new Set([SCOPES, 'README.md', 'LICENSE', 'mise.toml', '.gitignore']);

/** Each area's name and what it is about, as scopes.yaml lists them. */
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
		if (OWN.has(scope) || scope.startsWith('.')) continue;
		if (!statSync(folder).isDirectory()) {
			strays.push(relative(RFCS, folder));
			continue;
		}
		for (const file of readdirSync(folder).toSorted()) {
			const path = join(folder, file);
			const name = statSync(path).isFile() ? parseName(file) : undefined;
			if (name) files.push({ ...name, scope, path });
			else strays.push(relative(RFCS, path));
		}
	}
	return { files, strays };
}
