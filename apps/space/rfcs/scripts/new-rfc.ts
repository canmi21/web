/**
 * `new-rfc <name> <scope> [--dry-run]`: start an RFC from its name in title case, its slug the
 * name's words in lowercase, with an id no other holds and the next place in today's order, so
 * nobody picks any of them by hand. Prints the file it wrote.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { formatName, newId, rfcPath, SCOPE, SLUG, slugOf, today } from '../src/lib/rfc/name.ts';
import { RFCS, ROOT, rfcFiles, scopes } from './rfc-files.ts';

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const [name, scope] = args.filter((arg) => arg !== '--dry-run');
const slug = slugOf(name ?? '');

if (!name || !scope || !SCOPE.test(scope) || !SLUG.test(slug) || name.trim().length > 32) {
	console.error('usage: mise run new-rfc <name> <scope> [--dry-run]');
	console.error('  the name in title case, at most 32 characters; the scope an area, e.g.');
	console.error('  mise run new-rfc "Hue Pairs" design');
	process.exit(2);
}

const areas = scopes();
if (!areas.has(scope)) {
	console.error(`${scope} is not an area rfcs/scopes.yaml lists; it lists:`);
	for (const [area, about] of areas) console.error(`  ${area.padEnd(10)} ${about}`);
	console.error('  a new area is added there first');
	process.exit(2);
}

const { files } = rfcFiles();
const day = today();
const order =
	Math.max(0, ...files.filter((file) => file.day === day).map((file) => file.order)) + 1;
// An area's name is kept from the ids, since an id stands where an area's name does in a citation.
const id = newId(new Set([...files.map((file) => file.id), ...areas.keys()]));
const path = join(RFCS, scope, formatName({ day, order, slug, id }));

const TEMPLATE = `---
name: ${JSON.stringify(name.trim())}
title:
supersedes: []
commits: []
references: []
---

## Question

## Decision
`;

if (dryRun) console.log(`would write ${relative(ROOT, path)}`);
else {
	mkdirSync(dirname(path), { recursive: true });
	writeFileSync(path, TEMPLATE, { flag: 'wx' });
	console.log(relative(ROOT, path));
}
console.log(`id ${id}, read at ${rfcPath(scope, { slug, id })}`);
