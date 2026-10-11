/**
 * `new-rfc <name> <scope> [--status S] [--day yyyy-mmdd] [--dry-run]`: start an RFC from its name
 * in title case, its slug the name's words in lowercase, with an id no other holds and the next
 * place in its day's order, so nobody picks any of them by hand. The status is `draft` unless
 * given; the day is today unless the question is older than its RFC, as RFC p992n has it. Prints
 * the file it wrote.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import {
	formatName,
	newId,
	parseName,
	rfcPath,
	SCOPE,
	SLUG,
	slugOf,
	today,
} from '../src/lib/rfc/name.ts';
import { STATUSES, type Status } from '../src/lib/rfc/record.ts';
import { RFCS, rfcFiles, scopes } from './rfc-files.ts';

const args = process.argv.slice(2);
/** The value after a flag, taken out of the arguments with it. */
const option = (flag: string) => {
	const at = args.indexOf(flag);
	return at === -1 ? undefined : args.splice(at, 2)[1];
};
const status = (option('--status') ?? 'draft') as Status;
const day = option('--day') ?? today();
const dryRun = args.includes('--dry-run');
const [name, scope] = args.filter((arg) => !arg.startsWith('--'));
const slug = slugOf(name ?? '');
const valid =
	name &&
	scope &&
	SCOPE.test(scope) &&
	SLUG.test(slug) &&
	name.trim().length <= 32 &&
	STATUSES.includes(status) &&
	parseName(`${day}-01-a-aaaaa.md`);

if (!valid) {
	console.error(
		'usage: mise run new-rfc <name> <scope> [--status S] [--day yyyy-mmdd] [--dry-run]',
	);
	console.error('  the name in title case, at most 32 characters; the scope an area; the status');
	console.error(`  one of ${STATUSES.join(', ')}, draft unless given; e.g.`);
	console.error('  mise run new-rfc "Hue Pairs" design');
	process.exit(2);
}

const areas = scopes();
if (!areas.has(scope)) {
	console.error(`${scope} is not an area scopes.yaml lists; it lists:`);
	for (const [area, about] of areas) console.error(`  ${area.padEnd(10)} ${about}`);
	console.error('  a new area is added there first');
	process.exit(2);
}

const { files } = rfcFiles();
const order =
	Math.max(0, ...files.filter((file) => file.day === day).map((file) => file.order)) + 1;
if (order > 99) {
	console.error(`${day} holds 99 RFCs already, the most a day's two digits can place`);
	process.exit(1);
}
// An area's name is kept from the ids, since an id stands where an area's name does in a citation.
const id = newId(new Set([...files.map((file) => file.id), ...areas.keys()]));
const path = join(RFCS, scope, formatName({ day, order, slug, id }));

const TEMPLATE = `---
name: ${JSON.stringify(name.trim())}
title:
status: ${status}
supersedes: []
blocked-by: []
commits: []
references: []
---

## Question
${status === 'draft' ? '' : '\n## Decision\n'}`;

if (dryRun) console.log(`would write ${relative(RFCS, path)}`);
else {
	mkdirSync(dirname(path), { recursive: true });
	writeFileSync(path, TEMPLATE, { flag: 'wx' });
	console.log(relative(RFCS, path));
}
console.log(`id ${id}, read at ${rfcPath(scope, { slug, id })}`);
