/**
 * What blocks what among the RFCs, by `blocked-by` alone: every way the graph strays from RFC
 * p992n, and the order of the work read off it.
 */
import type { Status } from './record.ts';

/** Each RFC by id, with where it stands and what it is blocked by. */
export type Node = { status: Status; blockedBy: readonly string[] };
export type Graph = ReadonlyMap<string, Node>;

/** Still to be done: open, or decided and waiting. */
export const isOpen = (status: Status) => status === 'draft' || status === 'accepted';

/** Every cycle, each once, as the ids around it with the first repeated at the end. */
export function cycles(graph: Graph): string[][] {
	const found: string[][] = [];
	const done = new Set<string>();
	const walk = (id: string, path: string[]) => {
		const at = path.indexOf(id);
		if (at !== -1) {
			found.push([...path.slice(at), id]);
			return;
		}
		if (done.has(id) || !graph.has(id)) return;
		for (const next of graph.get(id)!.blockedBy) walk(next, [...path, id]);
		done.add(id);
	};
	for (const id of graph.keys()) walk(id, []);
	return found;
}

/** Every way one RFC's blockers stray: unknown, itself, or standing where they cannot. */
export function checkBlockers(id: string, graph: Graph): string[] {
	const node = graph.get(id);
	if (!node) return [];
	const problems: string[] = [];
	for (const other of node.blockedBy) {
		const blocker = graph.get(other);
		if (other === id) problems.push('is blocked by itself');
		else if (!blocker) problems.push(`is blocked by ${other}, which no RFC holds`);
		else if (node.status === 'landed' && isOpen(blocker.status))
			problems.push(`landed while ${other}, which blocks it, is ${blocker.status}`);
		else if (isOpen(node.status) && blocker.status === 'declined')
			problems.push(`is blocked by ${other}, which was declined; drop it`);
	}
	return problems;
}

/** The open RFCs this one waits on, directly. */
const waitsOn = (id: string, graph: Graph) =>
	(graph.get(id)?.blockedBy ?? []).filter((other) => {
		const blocker = graph.get(other);
		return blocker !== undefined && isOpen(blocker.status);
	});

/** The open RFCs nothing open blocks: what can be taken up now. */
export const ready = (graph: Graph) =>
	[...graph].filter(([id, node]) => isOpen(node.status) && waitsOn(id, graph).length === 0);

/**
 * The longest chain of open RFCs an open one waits behind, itself last: `[a, b, c]` reads a, then
 * b, then c. The graph is taken to have no cycle.
 */
export function chainOf(id: string, graph: Graph): string[] {
	let longest: string[] = [];
	for (const other of waitsOn(id, graph)) {
		const chain = chainOf(other, graph);
		if (chain.length > longest.length) longest = chain;
	}
	return [...longest, id];
}
