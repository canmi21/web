import { describe, expect, it } from 'vitest';
import type { Node } from '../server/nodes.ts';
import type { Point } from '../host.ts';
import type { Read } from '../server/read.ts';
import type { App, Cluster, Event } from '../wire.ts';
import { drifts, latest, lines, merge, placements, rowsOf, total } from './apps.ts';
import { ID } from '../server/nodes.fixture.ts';

const ORDER: Node[] = [ID.tyo, ID.gvx, ID.buf, ID.nrt, ID.hnd, ID.bru, ID.rdu];

const app = (name: string, image: string, over: Partial<App> = {}): App => ({
	name,
	image,
	deployed_at: '2026-10-06T08:00:00Z',
	running: true,
	held: false,
	...over,
});

const held = (apps: App[]) => ({
	version: 1,
	heard_at: '',
	snapshot: { taken_at: '', apps },
});

const cluster = {
	version: 1,
	node: ID.tyo,
	nodes: {
		[ID.tyo]: held([
			app('web', 'r/web@sha256:aaa'),
			app('geo', 'r/geo@sha256:ccc'),
			app('objects', 'r/objects@sha256:ddd', { running: false, driver: true }),
		]),
		[ID.gvx]: held([
			app('web', 'r/web@sha256:bbb', { deployed_at: '2026-10-06T09:00:00Z', held: true }),
			app('geo', 'r/geo@sha256:ccc', { running: false }),
		]),
	},
} as unknown as Cluster;

const ok = <T>(data: T): Read<T> => ({ ok: true, node: ID.tyo, data });
const failed: Read<never> = {
	ok: false,
	failure: { status: 502, code: 'upstream_unavailable', message: '' },
};

describe('apps', () => {
	it('flags an app whose nodes run different images', () => {
		expect(drifts(['a', 'a'])).toBe(false);
		expect(drifts(['a', 'b'])).toBe(true);
		const [geo, objects, web] = rowsOf(ORDER, cluster);
		expect([geo?.name, geo?.drift, geo?.running, geo?.instances]).toEqual(['geo', false, 1, 2]);
		expect([objects?.running, objects?.instances]).toEqual([0, 0]);
		expect([web?.name, web?.drift, web?.running, web?.deployed]).toEqual([
			'web',
			true,
			1,
			'2026-10-06T09:00:00Z',
		]);
	});

	it('states each placement in node order', () => {
		expect(placements(ORDER, cluster, 'web').map((one) => [one.node, one.state])).toEqual([
			[ID.tyo, 'running'],
			[ID.gvx, 'held'],
		]);
		expect(placements(ORDER, cluster, 'geo')[1]?.state).toBe('stopped');
		expect(placements(ORDER, cluster, 'objects')[0]?.state).toBe('driver');
		expect(placements(ORDER, cluster, 'none')).toEqual([]);
	});
});

describe('merge', () => {
	const event = (id: number, started_at: string): Event => ({
		id,
		app: 'web',
		action: 'deploy',
		source: { kind: 'run', run: id },
		outcome: 'succeeded',
		started_at,
	});

	it('puts every node newest first and names the node that did not answer', () => {
		const merged = merge(ORDER, {
			[ID.tyo]: ok([event(2, '2026-10-06T10:00:00Z'), event(1, '2026-10-06T06:00:00Z')]),
			[ID.gvx]: ok([event(7, '2026-10-06T08:00:00Z')]),
			[ID.buf]: failed,
		});
		expect(merged.events.map((one) => [one.node, one.id])).toEqual([
			[ID.tyo, 2],
			[ID.gvx, 7],
			[ID.tyo, 1],
		]);
		expect(merged.unknown).toEqual([ID.buf]);
	});
});

describe('series', () => {
	const points = (values: number[]): Point[] =>
		values.map((average, at) => ({
			at,
			values: { 'web.cpu': { average, minimum: 0, maximum: 9, count: 1 } },
		}));

	it('colors a line by its node, not its rank, and leaves out an unknown node', () => {
		const made = lines(
			ORDER,
			{ [ID.gvx]: ok(points([1, 2])), [ID.tyo]: failed, [ID.buf]: ok(points([3])) },
			'web.cpu',
		);
		expect(made.lines.map((line) => [line.key, line.color])).toEqual([
			[ID.gvx, 'var(--series-2)'],
			[ID.buf, 'var(--series-3)'],
		]);
		expect(made.unknown).toEqual([ID.tyo]);
		expect(latest(made.lines)).toEqual({ [ID.gvx]: 2, [ID.buf]: 3 });
	});

	it('adds the nodes moment by moment', () => {
		const made = lines(
			ORDER,
			{ [ID.tyo]: ok(points([1, 2])), [ID.gvx]: ok(points([10, 20, 30])) },
			'web.cpu',
		);
		expect(total(made.lines).map((one) => one.value)).toEqual([11, 22, 30]);
	});
});
