/**
 * `check-rfc`: every file under rfcs/ is an RFC named as the format says, its id is its own, what
 * it supersedes is an earlier decided RFC, its frontmatter and sections are the format's for its
 * status, and no host, mail address or IP address outside its references could be real.
 */
import { readFileSync } from 'node:fs';
import { relative } from 'node:path';
import { SCOPE } from '../src/lib/rfc/name.ts';
import {
	checkPrivate,
	checkSections,
	checkStatus,
	readFront,
	split,
} from '../src/lib/rfc/record.ts';
import { ROOT, rfcFiles, scopes } from './rfc-files.ts';

const { files, strays } = rfcFiles();
const problems: string[] = strays.map(
	(path) => `${path}: not an RFC; the name is rfcs/{scope}/{yyyy}-{mmdd}-{nn}-{slug}-{id}.md`,
);

const areas = scopes();
for (const [name] of areas)
	if (!SCOPE.test(name))
		problems.push(`rfcs/scopes.yaml: ${name} is not lowercase words and hyphens`);
for (const folder of new Set(files.map((file) => file.scope)))
	if (!areas.has(folder)) problems.push(`rfcs/${folder}/: not an area rfcs/scopes.yaml lists`);

const byId = new Map<string, (typeof files)[number]>();
const byPlace = new Map<string, string>();
const rank = (file: (typeof files)[number]) => `${file.day}-${String(file.order).padStart(2, '0')}`;

for (const file of files) {
	const where = relative(ROOT, file.path);
	if (areas.has(file.id)) problems.push(`${where}: id ${file.id} is also an area's name`);
	const holder = byId.get(file.id);
	if (holder) problems.push(`${where}: id ${file.id} is also ${relative(ROOT, holder.path)}'s`);
	else byId.set(file.id, file);
	const place = byPlace.get(rank(file));
	if (place) problems.push(`${where}: ${rank(file)} is also ${place}'s place`);
	else byPlace.set(rank(file), where);
}

// Only a decided RFC can be superseded, so every status is read before any is checked.
const texts = new Map(files.map((file) => [file.id, readFileSync(file.path, 'utf8')]));
const statusOf = new Map([...texts].map(([id, text]) => [id, readFront(text).front?.status]));

for (const file of files) {
	const where = relative(ROOT, file.path);
	const text = texts.get(file.id)!;
	const { front, problems: found } = readFront(text);
	const body = split(text)?.body ?? text;
	const own = [
		...found,
		...checkSections(body, front?.status),
		...(front ? checkStatus(front) : []),
		...checkPrivate(`${front?.title ?? ''}\n${body}`),
	];
	for (const id of front?.supersedes ?? []) {
		const earlier = byId.get(id);
		if (!earlier) own.push(`supersedes ${id}, which no RFC holds`);
		else if (rank(earlier) >= rank(file)) own.push(`supersedes ${id}, which is not earlier`);
		else if (statusOf.get(id)) own.push(`supersedes ${id}, which is ${statusOf.get(id)}`);
	}
	problems.push(...own.map((problem) => `${where}: ${problem}`));
}

if (problems.length > 0) {
	console.error(problems.join('\n'));
	process.exit(1);
}
console.log(`check-rfc: ${files.length} RFCs, all in form`);
