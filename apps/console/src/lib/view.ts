/**
 * Every node as this browser last heard it. Per node the highest version it has been sent is kept,
 * whichever relay or path sent it: an older one arriving late is dropped. See platform's
 * spec/architecture/relay.md, "A snapshot's version is its origin's clock". The same version
 * with anything beside the snapshot moved is taken too -- its `state`, which time alone changes,
 * its `runs`, its newest minute, a later `heard_at` -- and a peer the relay has not heard gives its
 * state alone -- the same file, "A node says it is leaving before it goes". A beat moves a node's
 * `heard_at`, a round's beats each one's, a watched node's second its `sample`, and a message of
 * a type this console does not know is passed over.
 */
import {
	CONTRACT,
	type Changes,
	type Cluster,
	type Entry,
	type EntryDelta,
	type Held,
	type Live,
	type Rows,
	type Second,
} from './wire.ts';

export interface View {
	nodes: Readonly<Record<string, Entry>>;
	/** The node whose relay last sent the whole cluster. */
	via?: string;
	/** A contract version this console cannot read, from the last relay that spoke one. */
	refused?: number;
}

export const EMPTY: View = { nodes: {} };

/** `view` with `message` taken in; the same object when nothing in it was newer. */
export function merge(view: View, message: Live): View {
	switch (message.type) {
		case 'node':
			return taken(view, { [message.node]: message.state });
		case 'cluster':
			return mergeCluster(view, message);
		case 'beat':
			return heard(view, message.node, message.heard_at);
		case 'beats':
			return Object.entries(message.beats).reduce(
				(held, [node, at]) => heard(held, node, at),
				view,
			);
		case 'readings':
			return sampled(view, message.node, message.sample);
		case 'delta':
			return fits(view, message) ? changed(view, message) : view;
		default:
			// A relay ahead of this console: what it cannot read, it leaves.
			return view;
	}
}

/** `view` with `node` heard at `at`, where that is later than held. */
function heard(view: View, node: string, at: string): View {
	const kept = view.nodes[node];
	if (kept?.heard_at === undefined || !(Date.parse(at) > Date.parse(kept.heard_at))) return view;
	return { ...view, nodes: { ...view.nodes, [node]: { ...kept, heard_at: at } } };
}

/** Whether `delta` applies to what `view` holds of its node: the version it was taken from. */
export function fits(view: View, delta: EntryDelta): boolean {
	return view.nodes[delta.node]?.version === delta.base;
}

/** `row`'s name, where it has one. */
const nameOf = (row: Record<string, unknown>) =>
	typeof row.name === 'string' ? row.name : undefined;

/** `base` with `rows` applied: gone names out, new or changed rows in place or at the end. */
function rowsAfter(base: Record<string, unknown>[], rows: Rows): Record<string, unknown>[] {
	let next = base.filter((row) => !rows.unset?.includes(nameOf(row) ?? ''));
	for (const row of rows.set ?? []) {
		const at = next.findIndex((held) => nameOf(held) === nameOf(row));
		if (at === -1) next.push(row);
		else next = next.with(at, row);
	}
	if (!rows.order) return next;
	return rows.order.flatMap((name) => next.filter((row) => nameOf(row) === name));
}

/** `base` with `changes` applied, as a relay's delta says them. */
function objectAfter(base: Record<string, unknown>, changes: Changes): Record<string, unknown> {
	const next: Record<string, unknown> = { ...base };
	for (const key of changes.unset ?? []) delete next[key];
	Object.assign(next, changes.set ?? {});
	if (changes.apps) {
		const held = Array.isArray(next.apps) ? (next.apps as Record<string, unknown>[]) : [];
		next.apps = rowsAfter(held, changes.apps);
	}
	return next;
}

/** `view` with `delta` applied to its node, which it fits. */
function changed(view: View, delta: EntryDelta): View {
	const kept = (view.nodes[delta.node] ?? {}) as Record<string, unknown>;
	const next = objectAfter(kept, { set: delta.set, unset: delta.unset });
	if (delta.snapshot && typeof next.snapshot === 'object' && next.snapshot !== null) {
		next.snapshot = objectAfter(next.snapshot as Record<string, unknown>, delta.snapshot);
	}
	return { ...view, nodes: { ...view.nodes, [delta.node]: next as unknown as Entry } };
}

/** `view` with a watched node's latest second. */
function sampled(view: View, node: string, sample: Second): View {
	const kept = view.nodes[node];
	if (!kept) return view;
	return { ...view, nodes: { ...view.nodes, [node]: { ...kept, sample } } };
}

/** `view` with a whole cluster taken in, as `/state` answers it or a socket opens with it. */
export function mergeCluster(view: View, cluster: Cluster): View {
	if (cluster.version !== CONTRACT) return { ...view, refused: cluster.version };
	const next = taken(view, cluster.nodes);
	return next.via === cluster.node && next.refused === undefined
		? next
		: { ...next, via: cluster.node, refused: undefined };
}

function taken(view: View, offered: Readonly<Record<string, Entry>>): View {
	let nodes: Record<string, Entry> | undefined;
	for (const [node, entry] of Object.entries(offered)) {
		const next = after(view.nodes[node], entry);
		if (next === view.nodes[node]) continue;
		nodes ??= { ...view.nodes };
		nodes[node] = next;
	}
	return nodes ? { ...view, nodes } : view;
}

/** Whether `entry`, at `kept`'s version, says anything beside the snapshot that `kept` does not. */
function moved(kept: Held, entry: Held): boolean {
	return (
		entry.state !== kept.state ||
		entry.runs !== kept.runs ||
		entry.readings?.at !== kept.readings?.at ||
		JSON.stringify(entry.round_trip) !== JSON.stringify(kept.round_trip) ||
		Date.parse(entry.heard_at) > Date.parse(kept.heard_at)
	);
}

/** What is held of a node once `entry` is offered: `kept` itself where nothing in it is news. */
function after(kept: Entry | undefined, entry: Entry): Entry {
	if (!kept) return entry;
	// A watched node's second is this console's own, and stays until the next.
	const sample = kept.sample === undefined ? {} : { sample: kept.sample };
	if (entry.version === undefined) {
		// What this browser holds stays, under what the relay says beside it now.
		const { state, runs, readings, round_trip } = entry;
		if (kept.state === state && kept.runs === runs && kept.readings?.at === readings?.at) {
			return kept;
		}
		return { ...kept, state, runs, readings, round_trip };
	}
	if (kept.version === undefined || entry.version > kept.version) return { ...entry, ...sample };
	if (entry.version !== kept.version || !moved(kept, entry)) return kept;
	const later =
		Date.parse(kept.heard_at) > Date.parse(entry.heard_at) ? kept.heard_at : entry.heard_at;
	return { ...entry, ...sample, heard_at: later };
}

/**
 * Every node's runs version as `nodes` holds them, as one key that moves when any node's runs do:
 * what a page reads its runs again on, since no snapshot carries events. Empty from a relay on a
 * build before it.
 */
export function runsOf(nodes: Readonly<Record<string, Entry>>): string {
	return Object.entries(nodes)
		.filter(([, entry]) => entry.runs !== undefined)
		.map(([node, entry]) => `${node}:${entry.runs}`)
		.toSorted()
		.join(' ');
}
