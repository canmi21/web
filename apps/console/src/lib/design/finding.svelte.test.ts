import { describe, expect, it } from 'vitest';
import type { Entry } from '../wire.ts';
import { find, findable } from './finding.ts';
import { ID, PLACED } from '../server/nodes.fixture.ts';
import { learnPlaces } from '../map/places.ts';

// Where control places each node; see RFC 17b3o.
learnPlaces(PLACED);

const app = (name: string) => ({ name, image: 'x', deployed_at: '', running: true, held: false });
const NODES: Record<string, Entry> = {
	[ID.tyo]: {
		version: 1,
		heard_at: '2026-10-09T00:00:00Z',
		snapshot: { taken_at: '', apps: [app('relay'), app('geo')] },
	},
	[ID.rdu]: { state: 'waiting' },
};

describe('finding', () => {
	it('lists the pages, the nodes and the apps of All, apps by name', () => {
		const all = findable('all', NODES);
		expect(all.filter((one) => one.kind === 'page').map((one) => one.label)).toContain('Nodes');
		expect(all.filter((one) => one.kind === 'node')).toHaveLength(9);
		expect(all.filter((one) => one.kind === 'app').map((one) => one.code)).toEqual(
			expect.arrayContaining(['relay', 'geo']),
		);
	});

	it('leaves the nodes out of a view that does not show them', () => {
		const services = findable('services', NODES);
		expect(services.some((one) => one.kind === 'node')).toBe(false);
		expect(services.some((one) => one.label === 'Nodes')).toBe(false);
	});

	it('finds a name that starts with the query before one that only holds it', () => {
		const all = findable('all', NODES);
		const found = find(all, 'no');
		expect(found[0]?.label).toBe('Nodes');
		expect(find(all, ID.tyo).map((one) => one.kind)).toEqual(['node']);
		expect(find(all, 'japan').every((one) => one.label.includes('Japan'))).toBe(true);
		// Tokyo's three are told apart by their short ids, and all three are still found by Tokyo.
		expect(find(all, '055d').map((one) => one.label)).toEqual(['Tokyo, Japan (055d)']);
		expect(find(all, 'tokyo').filter((one) => one.kind === 'node')).toHaveLength(3);
		expect(find(all, 'zzz')).toEqual([]);
		expect(find(all, '  ')).toHaveLength(all.length);
	});
});
