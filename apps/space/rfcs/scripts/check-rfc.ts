/**
 * `check-rfc`: every file in the rfcs repository is an RFC named as the format says, its id is
 * its own, what it supersedes is an earlier landed RFC, what blocks it makes no cycle, the commits
 * it names exist, its frontmatter and sections are the format's for its status, and no host, mail
 * address or IP address outside its references could be somebody else's.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { checkBlockers, cycles, type Graph } from '../src/lib/rfc/graph.ts';
import { SCOPE } from '../src/lib/rfc/name.ts';
import {
	checkPrivate,
	checkSections,
	checkStatus,
	readFront,
	split,
} from '../src/lib/rfc/record.ts';
import { RFCS, rfcFiles, scopes } from './rfc-files.ts';

if (!existsSync(RFCS)) {
	console.error(`check-rfc: no rfcs repository at ${RFCS}; clone it beside web`);
	process.exit(1);
}
const { files, strays } = rfcFiles();
if (process.argv.includes('--dry-run')) {
	console.log(`would check ${files.length} RFCs and ${strays.length} other files in ${RFCS}`);
	process.exit(0);
}
const problems: string[] = strays.map(
	(path) => `${path}: not an RFC; the name is {scope}/{yyyy}-{mmdd}-{nn}-{slug}-{id}.md`,
);

const areas = scopes();
for (const [name] of areas)
	if (!SCOPE.test(name)) problems.push(`scopes.yaml: ${name} is not lowercase words and hyphens`);
for (const folder of new Set(files.map((file) => file.scope)))
	if (!areas.has(folder)) problems.push(`${folder}/: not an area scopes.yaml lists`);

const byId = new Map<string, (typeof files)[number]>();
const byPlace = new Map<string, string>();
const rank = (file: (typeof files)[number]) => `${file.day}-${String(file.order).padStart(2, '0')}`;

for (const file of files) {
	const where = relative(RFCS, file.path);
	if (areas.has(file.id)) problems.push(`${where}: id ${file.id} is also an area's name`);
	const holder = byId.get(file.id);
	if (holder) problems.push(`${where}: id ${file.id} is also ${relative(RFCS, holder.path)}'s`);
	else byId.set(file.id, file);
	const place = byPlace.get(rank(file));
	if (place) problems.push(`${where}: ${rank(file)} is also ${place}'s place`);
	else byPlace.set(rank(file), where);
}

// What one RFC may name depends on where the others stand, so every front is read first.
const texts = new Map(files.map((file) => [file.id, readFileSync(file.path, 'utf8')]));
const fronts = new Map([...texts].map(([id, text]) => [id, readFront(text).front]));
const statusOf = (id: string) => fronts.get(id)?.status;
const graph: Graph = new Map(
	[...fronts].flatMap(([id, front]) =>
		front ? [[id, { status: front.status, blockedBy: front['blocked-by'] }] as const] : [],
	),
);
for (const cycle of cycles(graph)) problems.push(`blocked-by makes a cycle: ${cycle.join(' -> ')}`);

/** The repositories beside this one, `workspace` naming the workspace that holds them. */
const WORKSPACE = join(RFCS, '..', '..');
const checkout = (repo: string) => (repo === 'workspace' ? WORKSPACE : join(RFCS, '..', repo));
/** Whether a commit exists, or undefined when its repository is not cloned here to ask. */
function exists(commit: string): boolean | undefined {
	const [repo, hash] = commit.split('@') as [string, string];
	if (!existsSync(join(checkout(repo), '.jj'))) return undefined;
	const args = ['--ignore-working-copy', '-R', checkout(repo), 'log', '--no-graph', '-r', hash];
	try {
		execFileSync('jj', [...args, '-T', '""'], { stdio: 'ignore' });
		return true;
	} catch {
		return false;
	}
}

for (const file of files) {
	const where = relative(RFCS, file.path);
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
		else if (statusOf(id) !== 'landed') own.push(`supersedes ${id}, which is ${statusOf(id)}`);
	}
	own.push(...checkBlockers(file.id, graph));
	for (const commit of front?.commits ?? [])
		if (exists(commit) === false) own.push(`names ${commit}, which its repository does not hold`);
	problems.push(...own.map((problem) => `${where}: ${problem}`));
}

if (problems.length > 0) {
	console.error(problems.join('\n'));
	process.exit(1);
}
console.log(`check-rfc: ${files.length} RFCs, all in form`);
