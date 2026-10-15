import { beforeEach, describe, expect, it } from 'vitest';
import { NODES, learnNodes, learnedCores, order } from './nodes';
import { ID, PLACED } from './nodes.fixture';

const EVERY = Object.keys(NODES).toSorted();

describe('order, once control has said where the nodes are', () => {
	beforeEach(() => learnNodes(PLACED));

	it('puts the Tokyo nodes first for a reader in Osaka', () => {
		const nodes = order({ latitude: '34.6937', longitude: '135.5023' });
		expect(nodes.slice(0, 3).toSorted()).toEqual([ID.tyo, ID.nrt, ID.hnd].toSorted());
	});

	it('puts Brussels before Gävle for a reader in Paris', () => {
		const nodes = order({ latitude: '48.8566', longitude: '2.3522' });
		expect(nodes.slice(0, 2)).toEqual([ID.bru, ID.gvx]);
	});

	it('puts Raleigh before Buffalo for a reader in Virginia', () => {
		const nodes = order({ latitude: '37.5407', longitude: '-77.4360' });
		expect(nodes.slice(0, 2)).toEqual([ID.rdu, ID.buf]);
	});

	it('puts Shanghai first for a reader in Hangzhou, then the Tokyo nodes', () => {
		const nodes = order({ latitude: '30.2741', longitude: '120.1551' });
		expect(nodes[0]).toBe(ID.sha);
		expect(nodes.slice(1, 4).toSorted()).toEqual([ID.tyo, ID.nrt, ID.hnd].toSorted());
	});

	it('goes by the place over the continent when it has both', () => {
		const nodes = order({ latitude: '48.8566', longitude: '2.3522', continent: 'AS' });
		expect(nodes[0]).toBe(ID.bru);
	});

	it('puts a node control has not placed after every one it has', () => {
		const { [ID.gvx]: _, ...rest } = PLACED;
		learnNodes({ ...rest, [ID.gvx]: { core: false } });
		expect(order({ latitude: '59.3293', longitude: '18.0686' }).at(-1)).toBe(ID.gvx);
	});

	it('takes the cores control names, and passes over a node it has no binding for', () => {
		learnNodes({ ...PLACED, xyz: { coordinates: [0, 0], core: true } });
		expect(learnedCores()).toEqual([ID.tyo, ID.sin, ID.rdu]);
		expect(order({ latitude: '0', longitude: '0' })).not.toContain('xyz');
	});
});

describe('order, before control has said anything', () => {
	beforeEach(() => learnNodes({}));

	it('names no cores of its own', () => {
		expect(learnedCores()).toBeUndefined();
	});

	it('goes by the continent, even with a place', () => {
		expect(order({ latitude: '48.8566', longitude: '2.3522', continent: 'EU' })[0]).toBe(ID.gvx);
		expect(order({ continent: 'AS' }).slice(0, 5)).toEqual([
			ID.tyo,
			ID.sin,
			ID.nrt,
			ID.hnd,
			ID.sha,
		]);
		expect(order({ continent: 'NA', latitude: '' }).slice(0, 2)).toEqual([ID.buf, ID.rdu]);
	});

	it('falls back to the fixed order with nothing to go by', () => {
		expect(order(undefined)).toEqual(Object.keys(NODES));
		expect(order({ continent: 'AN' })).toEqual(Object.keys(NODES));
	});

	it('names every node once, whatever the reader', () => {
		for (const where of [undefined, { continent: 'EU' }, { latitude: '0', longitude: '0' }]) {
			expect(order(where).toSorted()).toEqual(EVERY);
		}
	});
});
