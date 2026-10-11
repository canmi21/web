/**
 * `plan`: what is left, read off the RFCs rather than kept by hand -- the open ones nothing open
 * blocks, then each of the rest behind the longest chain it waits on. See RFC p992n.
 */
import { readFileSync } from 'node:fs';
import { chainOf, isOpen, ready, type Graph } from '../src/lib/rfc/graph.ts';
import { readFront, type Front } from '../src/lib/rfc/record.ts';
import { rfcFiles } from './rfc-files.ts';

const { files } = rfcFiles();
const fronts = new Map<string, Front & { scope: string }>();
for (const file of files) {
	const { front } = readFront(readFileSync(file.path, 'utf8'));
	if (front) fronts.set(file.id, { ...front, scope: file.scope });
}
const graph: Graph = new Map(
	[...fronts].map(([id, front]) => [id, { status: front.status, blockedBy: front['blocked-by'] }]),
);

const line = (id: string) => {
	const front = fronts.get(id)!;
	return `${id}  ${front.status.padEnd(8)}  ${front.scope.padEnd(10)}  ${front.name}`;
};
const now = ready(graph).map(([id]) => id);
const waiting = [...graph]
	.filter(([id, node]) => isOpen(node.status) && !now.includes(id))
	.map(([id]) => chainOf(id, graph))
	.toSorted((a, b) => b.length - a.length);

console.log(`Ready, nothing open blocks them (${now.length}):`);
for (const id of now) console.log(`  ${line(id)}`);
console.log(`\nWaiting (${waiting.length}), each after the longest chain ahead of it:`);
for (const chain of waiting) {
	console.log(`  ${line(chain.at(-1)!)}`);
	console.log(`         ${chain.join(' -> ')}`);
}
