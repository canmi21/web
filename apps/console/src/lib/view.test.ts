import { describe, expect, it } from 'vitest';
import { EMPTY, fits, merge, mergeCluster, runsOf } from './view.ts';
import { CONTRACT, type Live } from './wire.ts';
import type { Held } from './wire.ts';
import { ID } from './server/nodes.fixture.ts';

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
		const first = merge(EMPTY, { type: 'node', node: ID.tyo, state: held(200) });
		const late = merge(first, { type: 'node', node: ID.tyo, state: held(100, 'apt') });
		expect(late.nodes[ID.tyo]?.version).toBe(200);
		expect(late.nodes[ID.tyo]?.snapshot?.apps[0]?.name).toBe('geo');
		const newer = merge(late, { type: 'node', node: ID.tyo, state: held(300, 'apt') });
		expect(newer.nodes[ID.tyo]?.snapshot?.apps[0]?.name).toBe('apt');
	});

	it('leaves the view as it was when nothing offered is newer, so nothing repaints', () => {
		const view = merge(EMPTY, { type: 'node', node: ID.tyo, state: held(200) });
		expect(merge(view, { type: 'node', node: ID.tyo, state: held(200) })).toBe(view);
	});

	it('takes the same version again where its state moved, as time alone moves it', () => {
		const view = merge(EMPTY, {
			type: 'node',
			node: ID.tyo,
			state: { ...held(200), state: 'live' },
		});
		const late = merge(view, {
			type: 'node',
			node: ID.tyo,
			state: { ...held(200), state: 'late' },
		});
		expect(late.nodes[ID.tyo]?.state).toBe('late');
		expect(
			merge(late, { type: 'node', node: ID.tyo, state: { ...held(200), state: 'late' } }),
		).toBe(late);
		expect(
			merge(late, { type: 'node', node: ID.tyo, state: { ...held(100), state: 'live' } }).nodes[
				ID.tyo
			]?.state,
		).toBe('late');
	});

	it('takes the same version again where its runs moved, so a page reads the runs again', () => {
		const view = merge(EMPTY, { type: 'node', node: ID.tyo, state: { ...held(200), runs: 7 } });
		const moved = merge(view, { type: 'node', node: ID.tyo, state: { ...held(200), runs: 9 } });
		expect(moved.nodes[ID.tyo]?.runs).toBe(9);
		expect(merge(moved, { type: 'node', node: ID.tyo, state: { ...held(200), runs: 9 } })).toBe(
			moved,
		);
		// A peer not heard gives its runs too, beside its state.
		const unheard = merge(moved, {
			type: 'node',
			node: ID.tyo,
			state: { state: 'gone', runs: 11 },
		});
		expect([unheard.nodes[ID.tyo]?.version, unheard.nodes[ID.tyo]?.runs]).toEqual([200, 11]);
	});

	it('takes a node from a relay whose snapshots still carry events, and reads nothing of them', () => {
		const old = { ...held(200), snapshot: { ...held(200).snapshot, events: [{ id: 1 }] } };
		const view = merge(EMPTY, { type: 'node', node: ID.tyo, state: old });
		expect(view.nodes[ID.tyo]?.version).toBe(200);
		expect(runsOf(view.nodes)).toBe('');
	});

	it("moves a node heard by its beat, and keeps a round's second across a newer entry", () => {
		let view = merge(EMPTY, { type: 'node', node: ID.tyo, state: held(200) });
		view = merge(view, { type: 'beat', node: ID.tyo, heard_at: '2026-10-06T12:00:09Z' });
		expect(view.nodes[ID.tyo]?.heard_at).toBe('2026-10-06T12:00:09Z');
		// An older beat, arriving late, moves nothing.
		const late = merge(view, { type: 'beat', node: ID.tyo, heard_at: '2026-10-06T12:00:03Z' });
		expect(late).toBe(view);
		const sample = { at: 1, values: { 'cpu.usage': 40 } };
		// A round's seconds, one a node; a node not held takes none.
		view = merge(view, { type: 'seconds', seconds: { [ID.tyo]: sample, [ID.rdu]: sample } });
		expect([view.nodes[ID.tyo]?.sample, view.nodes[ID.rdu]]).toEqual([sample, undefined]);
		// The same version again keeps the later beat; a newer one keeps the second too.
		const again = merge(view, { type: 'node', node: ID.tyo, state: { ...held(200), runs: 3 } });
		expect([again.nodes[ID.tyo]?.heard_at, again.nodes[ID.tyo]?.runs]).toEqual([
			'2026-10-06T12:00:09Z',
			3,
		]);
		expect(
			merge(again, { type: 'node', node: ID.tyo, state: held(300) }).nodes[ID.tyo]?.sample,
		).toEqual(sample);
	});

	it("moves every node a round's beats heard, each only forward, and nothing for one unknown", () => {
		let view = merge(EMPTY, { type: 'node', node: ID.tyo, state: held(200) });
		view = merge(view, { type: 'node', node: ID.rdu, state: held(100) });
		const before = view.nodes[ID.rdu]?.heard_at;
		const round = merge(view, {
			type: 'beats',
			beats: {
				[ID.tyo]: '2026-10-06T12:00:09Z',
				[ID.rdu]: '2000-01-01T00:00:00Z',
				[ID.sin]: '2026-10-06T12:00:09Z',
			},
		});
		expect(round.nodes[ID.tyo]?.heard_at).toBe('2026-10-06T12:00:09Z');
		expect(round.nodes[ID.rdu]?.heard_at).toBe(before);
		expect(round.nodes[ID.sin]).toBeUndefined();
		// A round that moves nothing is the same view.
		expect(merge(round, { type: 'beats', beats: { [ID.tyo]: '2026-10-06T12:00:03Z' } })).toBe(
			round,
		);
		expect(merge(round, { type: 'beats', beats: {} })).toBe(round);
	});

	it('takes the same version again where its newest minute moved', () => {
		const minute = (at: string) => ({ at, values: { 'cpu.usage': { mean: 4, max: 9 } } });
		const view = merge(EMPTY, {
			type: 'node',
			node: ID.tyo,
			state: { ...held(200), readings: minute('2026-10-06T12:00:00Z') },
		});
		const next = merge(view, {
			type: 'node',
			node: ID.tyo,
			state: { ...held(200), readings: minute('2026-10-06T12:01:00Z') },
		});
		expect(next.nodes[ID.tyo]?.readings?.at).toBe('2026-10-06T12:01:00Z');
	});

	it("applies a delta to the version it was taken from, the snapshot's apps by name", () => {
		const view = merge(EMPTY, { type: 'node', node: ID.tyo, state: { ...held(200), runs: 2 } });
		const delta = {
			type: 'delta' as const,
			node: ID.tyo,
			base: 200,
			set: { version: 300, heard_at: '2026-10-06T12:00:30Z' },
			unset: ['runs'],
			snapshot: { apps: { set: [{ name: 'apt', image: 'apt:1', running: true }] } },
		};
		expect(fits(view, delta)).toBe(true);
		const next = merge(view, delta);
		expect(next.nodes[ID.tyo]?.version).toBe(300);
		expect(next.nodes[ID.tyo]?.runs).toBeUndefined();
		expect(next.nodes[ID.tyo]?.snapshot?.apps.map((app) => app.name)).toEqual(['geo', 'apt']);
		// From a version this browser does not hold, it does not fit, and is not applied.
		const late = { ...delta, base: 100 };
		expect(fits(next, late)).toBe(false);
		expect(merge(next, late)).toBe(next);
		// An order moves the rows, and a gone name takes its row out.
		const moved = merge(next, {
			type: 'delta',
			node: ID.tyo,
			base: 300,
			snapshot: { apps: { unset: ['geo'], order: ['apt'] } },
		});
		expect(moved.nodes[ID.tyo]?.snapshot?.apps.map((app) => app.name)).toEqual(['apt']);
	});

	it('passes over a message of a type it does not know', () => {
		const view = merge(EMPTY, { type: 'node', node: ID.tyo, state: held(200) });
		const unknown = { type: 'sync', nodes: {} } as unknown as Live;
		expect(merge(view, unknown)).toBe(view);
	});

	it('takes a peer its relay has not heard as its state alone, keeping what was held of it', () => {
		const waiting = merge(EMPTY, { type: 'node', node: ID.rdu, state: { state: 'waiting' } });
		expect(waiting.nodes[ID.rdu]).toEqual({ state: 'waiting' });
		const heard = merge(waiting, { type: 'node', node: ID.rdu, state: held(100) });
		expect(heard.nodes[ID.rdu]?.version).toBe(100);
		// A relay just started has not heard it yet: the snapshot stays, under the relay's word.
		const again = merge(heard, { type: 'node', node: ID.rdu, state: { state: 'waiting' } });
		expect(again.nodes[ID.rdu]?.version).toBe(100);
		expect(again.nodes[ID.rdu]?.state).toBe('waiting');
		expect(merge(again, { type: 'node', node: ID.rdu, state: { state: 'waiting' } })).toBe(again);
	});

	it('takes from a cluster only what it holds newer, and keeps nodes it does not name', () => {
		let view = merge(EMPTY, { type: 'node', node: ID.tyo, state: held(500) });
		view = merge(view, { type: 'node', node: ID.rdu, state: held(100) });
		// A relay that fell behind on tyo and has not heard of rdu at all, as after a reconnect.
		view = merge(view, {
			type: 'cluster',
			version: CONTRACT,
			node: ID.gvx,
			nodes: { [ID.tyo]: held(400, 'apt'), [ID.gvx]: held(50) },
		});
		expect(view.nodes[ID.tyo]?.version).toBe(500);
		expect(view.nodes[ID.rdu]?.version).toBe(100);
		expect(view.nodes[ID.gvx]?.version).toBe(50);
		expect(view.via).toBe(ID.gvx);
	});

	it('reads no cluster of another contract, and says so', () => {
		const other = CONTRACT + 1;
		const view = mergeCluster(EMPTY, {
			version: other,
			node: ID.tyo,
			nodes: { [ID.tyo]: held(1) },
		});
		expect(view.nodes).toEqual({});
		expect(view.refused).toBe(other);
		expect(
			mergeCluster(view, { version: CONTRACT, node: ID.tyo, nodes: {} }).refused,
		).toBeUndefined();
	});
});

describe('runsOf', () => {
	it("moves when any node's runs do, and is empty where no relay says", () => {
		const one = runsOf({
			[ID.tyo]: { ...held(1), runs: 7 },
			[ID.gvx]: { state: 'waiting', runs: 2 },
		});
		expect(one).toBe(`${ID.gvx}:2 ${ID.tyo}:7`);
		expect(
			runsOf({ [ID.tyo]: { ...held(9), runs: 7 }, [ID.gvx]: { state: 'waiting', runs: 2 } }),
		).toBe(one);
		expect(
			runsOf({ [ID.tyo]: { ...held(1), runs: 8 }, [ID.gvx]: { state: 'waiting', runs: 2 } }),
		).not.toBe(one);
		expect(runsOf({ [ID.tyo]: held(1) })).toBe('');
	});
});
