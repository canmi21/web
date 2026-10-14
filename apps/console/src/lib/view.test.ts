import { describe, expect, it } from 'vitest';
import { EMPTY, merge, mergeCluster, runsOf } from './view.ts';
import type { Live } from './wire.ts';
import type { Held } from './wire.ts';

function held(version: number, app = 'geo'): Held {
	const deployed = { image: `${app}:1`, deployed_at: '2026-10-06T11:00:00Z' };
	return {
		version,
		heard_at: '2026-10-06T12:00:00Z',
		snapshot: {
			taken_at: '2026-10-06T12:00:00Z',
			apps: [{ name: app, ...deployed, running: true, held: false }],
		},
	};
}

describe('merge', () => {
	it('takes a newer version of a node and drops an older one arriving late', () => {
		const first = merge(EMPTY, { type: 'node', node: 'tyo', state: held(200) });
		const late = merge(first, { type: 'node', node: 'tyo', state: held(100, 'apt') });
		expect(late.nodes.tyo?.version).toBe(200);
		expect(late.nodes.tyo?.snapshot?.apps[0]?.name).toBe('geo');
		const newer = merge(late, { type: 'node', node: 'tyo', state: held(300, 'apt') });
		expect(newer.nodes.tyo?.snapshot?.apps[0]?.name).toBe('apt');
	});

	it('leaves the view as it was when nothing offered is newer, so nothing repaints', () => {
		const view = merge(EMPTY, { type: 'node', node: 'tyo', state: held(200) });
		expect(merge(view, { type: 'node', node: 'tyo', state: held(200) })).toBe(view);
	});

	it('takes the same version again where its state moved, as time alone moves it', () => {
		const view = merge(EMPTY, {
			type: 'node',
			node: 'tyo',
			state: { ...held(200), state: 'live' },
		});
		const late = merge(view, { type: 'node', node: 'tyo', state: { ...held(200), state: 'late' } });
		expect(late.nodes.tyo?.state).toBe('late');
		expect(merge(late, { type: 'node', node: 'tyo', state: { ...held(200), state: 'late' } })).toBe(
			late,
		);
		expect(
			merge(late, { type: 'node', node: 'tyo', state: { ...held(100), state: 'live' } }).nodes.tyo
				?.state,
		).toBe('late');
	});

	it('takes the same version again where its runs moved, so a page reads the runs again', () => {
		const view = merge(EMPTY, { type: 'node', node: 'tyo', state: { ...held(200), runs: 7 } });
		const moved = merge(view, { type: 'node', node: 'tyo', state: { ...held(200), runs: 9 } });
		expect(moved.nodes.tyo?.runs).toBe(9);
		expect(merge(moved, { type: 'node', node: 'tyo', state: { ...held(200), runs: 9 } })).toBe(
			moved,
		);
		// A peer not heard gives its runs too, beside its state.
		const unheard = merge(moved, { type: 'node', node: 'tyo', state: { state: 'gone', runs: 11 } });
		expect([unheard.nodes.tyo?.version, unheard.nodes.tyo?.runs]).toEqual([200, 11]);
	});

	it('takes a node from a relay whose snapshots still carry events, and reads nothing of them', () => {
		const old = { ...held(200), snapshot: { ...held(200).snapshot, events: [{ id: 1 }] } };
		const view = merge(EMPTY, { type: 'node', node: 'tyo', state: old });
		expect(view.nodes.tyo?.version).toBe(200);
		expect(runsOf(view.nodes)).toBe('');
	});

	it('moves a node heard by its beat, and keeps a watched second across a newer entry', () => {
		let view = merge(EMPTY, { type: 'node', node: 'tyo', state: held(200) });
		view = merge(view, { type: 'beat', node: 'tyo', heard_at: '2026-10-06T12:00:09Z' });
		expect(view.nodes.tyo?.heard_at).toBe('2026-10-06T12:00:09Z');
		// An older beat, arriving late, moves nothing.
		const late = merge(view, { type: 'beat', node: 'tyo', heard_at: '2026-10-06T12:00:03Z' });
		expect(late).toBe(view);
		const sample = { at: 1, values: { 'cpu.usage': 40 } };
		view = merge(view, { type: 'readings', node: 'tyo', sample });
		expect(view.nodes.tyo?.sample).toEqual(sample);
		// The same version again keeps the later beat; a newer one keeps the second too.
		const again = merge(view, { type: 'node', node: 'tyo', state: { ...held(200), runs: 3 } });
		expect([again.nodes.tyo?.heard_at, again.nodes.tyo?.runs]).toEqual(['2026-10-06T12:00:09Z', 3]);
		expect(merge(again, { type: 'node', node: 'tyo', state: held(300) }).nodes.tyo?.sample).toEqual(
			sample,
		);
	});

	it('takes the same version again where its newest minute moved', () => {
		const minute = (at: string) => ({ at, values: { 'cpu.usage': { mean: 4, max: 9 } } });
		const view = merge(EMPTY, {
			type: 'node',
			node: 'tyo',
			state: { ...held(200), readings: minute('2026-10-06T12:00:00Z') },
		});
		const next = merge(view, {
			type: 'node',
			node: 'tyo',
			state: { ...held(200), readings: minute('2026-10-06T12:01:00Z') },
		});
		expect(next.nodes.tyo?.readings?.at).toBe('2026-10-06T12:01:00Z');
	});

	it('passes over a message of a type it does not know', () => {
		const view = merge(EMPTY, { type: 'node', node: 'tyo', state: held(200) });
		const unknown = { type: 'sync', nodes: {} } as unknown as Live;
		expect(merge(view, unknown)).toBe(view);
	});

	it('takes a peer its relay has not heard as its state alone, keeping what was held of it', () => {
		const waiting = merge(EMPTY, { type: 'node', node: 'rdu', state: { state: 'waiting' } });
		expect(waiting.nodes.rdu).toEqual({ state: 'waiting' });
		const heard = merge(waiting, { type: 'node', node: 'rdu', state: held(100) });
		expect(heard.nodes.rdu?.version).toBe(100);
		// A relay just started has not heard it yet: the snapshot stays, under the relay's word.
		const again = merge(heard, { type: 'node', node: 'rdu', state: { state: 'waiting' } });
		expect(again.nodes.rdu?.version).toBe(100);
		expect(again.nodes.rdu?.state).toBe('waiting');
		expect(merge(again, { type: 'node', node: 'rdu', state: { state: 'waiting' } })).toBe(again);
	});

	it('takes from a cluster only what it holds newer, and keeps nodes it does not name', () => {
		let view = merge(EMPTY, { type: 'node', node: 'tyo', state: held(500) });
		view = merge(view, { type: 'node', node: 'rdu', state: held(100) });
		// A relay that fell behind on tyo and has not heard of rdu at all, as after a reconnect.
		view = merge(view, {
			type: 'cluster',
			version: 1,
			node: 'gvx',
			nodes: { tyo: held(400, 'apt'), gvx: held(50) },
		});
		expect(view.nodes.tyo?.version).toBe(500);
		expect(view.nodes.rdu?.version).toBe(100);
		expect(view.nodes.gvx?.version).toBe(50);
		expect(view.via).toBe('gvx');
	});

	it('reads no cluster of another contract, and says so', () => {
		const view = mergeCluster(EMPTY, { version: 2, node: 'tyo', nodes: { tyo: held(1) } });
		expect(view.nodes).toEqual({});
		expect(view.refused).toBe(2);
		expect(mergeCluster(view, { version: 1, node: 'tyo', nodes: {} }).refused).toBeUndefined();
	});
});

describe('runsOf', () => {
	it("moves when any node's runs do, and is empty where no relay says", () => {
		const one = runsOf({ tyo: { ...held(1), runs: 7 }, gvx: { state: 'waiting', runs: 2 } });
		expect(one).toBe('gvx:2 tyo:7');
		expect(runsOf({ tyo: { ...held(9), runs: 7 }, gvx: { state: 'waiting', runs: 2 } })).toBe(one);
		expect(runsOf({ tyo: { ...held(1), runs: 8 }, gvx: { state: 'waiting', runs: 2 } })).not.toBe(
			one,
		);
		expect(runsOf({ tyo: held(1) })).toBe('');
	});
});
