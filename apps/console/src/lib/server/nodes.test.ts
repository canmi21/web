import { beforeEach, describe, expect, it } from 'vitest';
import { NODES, learnNodes, learnedCores, order } from './nodes';
import { PLACED } from './nodes.fixture';

const EVERY = Object.keys(NODES).toSorted();

describe('order, once the registry has said where the nodes are', () => {
	beforeEach(() => learnNodes(PLACED));

	it('puts the Tokyo nodes first for a reader in Osaka', () => {
		const nodes = order({ latitude: '34.6937', longitude: '135.5023' });
		expect(nodes.slice(0, 3).toSorted()).toEqual(['hnd', 'nrt', 'tyo']);
	});

	it('puts bru before gvx for a reader in Paris', () => {
		const nodes = order({ latitude: '48.8566', longitude: '2.3522' });
		expect(nodes.slice(0, 2)).toEqual(['bru', 'gvx']);
	});

	it('puts rdu before buf for a reader in Virginia', () => {
		const nodes = order({ latitude: '37.5407', longitude: '-77.4360' });
		expect(nodes.slice(0, 2)).toEqual(['rdu', 'buf']);
	});

	it('puts sha first for a reader in Hangzhou, then the Tokyo nodes', () => {
		const nodes = order({ latitude: '30.2741', longitude: '120.1551' });
		expect(nodes[0]).toBe('sha');
		expect(nodes.slice(1, 4).toSorted()).toEqual(['hnd', 'nrt', 'tyo']);
	});

	it('goes by the place over the continent when it has both', () => {
		const nodes = order({ latitude: '48.8566', longitude: '2.3522', continent: 'AS' });
		expect(nodes[0]).toBe('bru');
	});

	it('puts a node the registry has not placed after every one it has', () => {
		const { gvx: _, ...rest } = PLACED;
		learnNodes({ ...rest, gvx: { core: false } });
		expect(order({ latitude: '59.3293', longitude: '18.0686' }).at(-1)).toBe('gvx');
	});

	it('takes the cores the registry names, and passes over a node it has no binding for', () => {
		learnNodes({ ...PLACED, xyz: { coordinates: [0, 0], core: true } });
		expect(learnedCores()).toEqual(['tyo', 'sin', 'rdu']);
		expect(order({ latitude: '0', longitude: '0' })).not.toContain('xyz');
	});
});

describe('order, before the registry has said anything', () => {
	beforeEach(() => learnNodes({}));

	it('names no cores of its own', () => {
		expect(learnedCores()).toBeUndefined();
	});

	it('goes by the continent, even with a place', () => {
		expect(order({ latitude: '48.8566', longitude: '2.3522', continent: 'EU' })[0]).toBe('gvx');
		expect(order({ continent: 'AS' }).slice(0, 5)).toEqual(['tyo', 'sin', 'nrt', 'hnd', 'sha']);
		expect(order({ continent: 'NA', latitude: '' }).slice(0, 2)).toEqual(['buf', 'rdu']);
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
