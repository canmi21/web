/**
 * `new-rfc <scope> <slug> [--dry-run]`: start an RFC with an id no other holds and the next place
 * in today's order, so nobody picks either by hand. Prints the file it wrote.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { formatName, newId, rfcPath, SCOPE, SLUG, today } from '../src/lib/rfc/name.ts';
import { RFCS, ROOT, rfcFiles, scopes } from './rfc-files.ts';

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const [scope, slug] = args.filter((arg) => arg !== '--dry-run');

if (!scope || !slug || !SCOPE.test(scope) || !SLUG.test(slug)) {
	console.error('usage: mise run new-rfc <scope> <slug> [--dry-run]');
	console.error('  scope and slug in lowercase words joined by hyphens, e.g. design hue-pairs');
	process.exit(2);
}

const areas = scopes();
if (!areas.has(scope)) {
	console.error(`${scope} is not an area rfcs/scopes.yaml lists; it lists:`);
	for (const [name, about] of areas) console.error(`  ${name.padEnd(10)} ${about}`);
	console.error('  a new area is added there first');
	process.exit(2);
}

const { files } = rfcFiles();
const day = today();
const order =
	Math.max(0, ...files.filter((file) => file.day === day).map((file) => file.order)) + 1;
const id = newId(new Set(files.map((file) => file.id)));
const path = join(RFCS, scope, formatName({ day, order, slug, id }));

const TEMPLATE = `---
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
