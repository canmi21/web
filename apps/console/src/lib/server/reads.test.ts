import { describe, expect, it, vi } from 'vitest';
import { bound, paths, success } from './bound.ts';
import { app, appHealth, appSeries, apps, disk, events, history } from './reads.ts';
import { nodeNow, nodeSeries, pointsOf, range } from './reads.ts';
import { NODES } from './nodes.ts';
import { ID } from './nodes.fixture.ts';

const NOW = 1_000_000;

describe('range', () => {
	it('draws a day or less from minutes and everything longer from hours', () => {
		expect(range('1h', NOW)).toEqual({ grain: 'minute', since: NOW - 3600, until: NOW });
		expect(range('6h', NOW)).toEqual({ grain: 'minute', since: NOW - 6 * 3600, until: NOW });
		expect(range('24h', NOW)).toEqual({ grain: 'minute', since: NOW - 86_400, until: NOW });
		expect(range('7d', NOW)).toMatchObject({ grain: 'hour', since: NOW - 7 * 86_400 });
		expect(range('30d', NOW)).toMatchObject({ grain: 'hour', since: NOW - 30 * 86_400 });
	});
});

describe('one node', () => {
	it('asks host for each path and query, and hands back the data', async () => {
		const { sent, env } = bound({ [ID.tyo]: () => success([]) });
		const edge = { env };
		const span = { grain: 'hour', since: 10, until: 20 } as const;
		await nodeNow(edge, ID.tyo);
		await nodeSeries(edge, ID.tyo, { ...span, metrics: ['cpu.usage', 'load.1'] });
		await nodeSeries(edge, ID.tyo, span);
		await apps(edge, ID.tyo);
		await app(edge, ID.tyo, 'web');
		await appHealth(edge, ID.tyo, 'database');
		await appSeries(edge, ID.tyo, 'web', span);
		await history(edge, ID.tyo, 'web', { before: 9, limit: 5 });
		await history(edge, ID.tyo, 'web');
		await events(edge, ID.tyo, { limit: 20 });
		await events(edge, ID.tyo);
		await disk(edge, ID.tyo);
		expect(paths(sent)).toEqual([
			'/node/now',
			'/node/series?grain=hour&metrics=cpu.usage%2Cload.1&since=10&until=20',
			'/node/series?grain=hour&since=10&until=20',
			'/apps',
			'/apps/web',
			'/apps/database/health',
			'/apps/web/metrics/series?grain=hour&since=10&until=20',
			'/apps/web/history?before=9&limit=5',
			'/apps/web/history',
			'/events?limit=20',
			'/events',
			'/inspect/disk',
		]);
	});

	it('keeps an app name to one path segment', async () => {
		const { sent, env } = bound({ [ID.tyo]: () => success(null) });
		await app({ env }, ID.tyo, '../node/now');
		expect(paths(sent)).toEqual(['/apps/..%2Fnode%2Fnow']);
	});

	it('gives up on a node that does not answer in time', async () => {
		const env = {
			HOST_READ_TOKEN: 't',
			[NODES[ID.tyo]]: {
				fetch: (_url: string, init: RequestInit) =>
					new Promise((_, reject) => {
						init.signal?.addEventListener('abort', () => reject(init.signal?.reason));
					}),
			},
		} as never;
		vi.spyOn(console, 'error').mockImplementation(() => {});
		vi.useFakeTimers();
		const pending = nodeNow({ env }, ID.tyo);
		await vi.advanceTimersByTimeAsync(4001);
		expect(await pending).toMatchObject({ ok: false, failure: { status: 502 } });
		vi.useRealTimers();
		vi.restoreAllMocks();
	});
});

describe("a node's series from the relay's minutes", () => {
	it("is each asked metric's mean, its highest as the upper bound, a slot a point", () => {
		const history = {
			version: 1,
			node: ID.rdu,
			from: '2026-10-14T12:00:00Z',
			until: '2026-10-14T13:00:00Z',
			slot: 60,
			nodes: {
				[ID.tyo]: [
					{
						at: '2026-10-14T12:00:00Z',
						readings: { 'cpu.usage': { mean: 12, max: 80 }, 'load.1': { mean: 1, max: 2 } },
					},
					{ at: '2026-10-14T12:01:00Z', beats: 20 },
				],
			},
		};
		const points = pointsOf(history, ID.tyo, ['cpu']);
		expect(points).toEqual([
			{
				at: Date.parse('2026-10-14T12:00:00Z') / 1000,
				values: { 'cpu.usage': { average: 12, minimum: 12, maximum: 80, count: 1 } },
			},
		]);
		expect(pointsOf(history, ID.gvx)).toEqual([]);
	});
});
