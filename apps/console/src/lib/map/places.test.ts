import { afterEach, describe, expect, it } from 'vitest';
import {
	displayName,
	gather,
	type Member,
	nameOf,
	nearestOf,
	nodeLabel,
	PLACES,
	rank,
	learnPlaces,
} from './places.ts';
import { PLACED } from '../server/nodes.fixture.ts';

// Where the registry places each node; see RFC 17b3o.
learnPlaces(PLACED);

const GIB = 2 ** 30;
const member = (code: string, overrides: Partial<Member> = {}): Member => ({
	code,
	role: 'relay',
	cluster: undefined,
	state: 'live',
	apps: { running: 7, total: 7 },
	memory: GIB,
	used: undefined,
	cpu: 1,
	heard: '2026-10-06T12:00:00Z',
	point: [100, 100],
	...overrides,
});

const tokyo = (overrides: Partial<Member> = {}) => ({ cluster: 'tokyo', ...overrides });
/** Tokyo's state with its nodes in each of `states`, in node order. */
const place = (...states: Member['state'][]) =>
	gather(
		states.map((state, index) => member(['tyo', 'nrt', 'hnd'][index] ?? '', tokyo({ state }))),
	)[0]?.state;

describe('the marks the nodes gather into', () => {
	it('draws the nodes of one place as one mark, and a node alone as its own', () => {
		const sites = gather([
			member('tyo', tokyo({ role: 'core', point: [100, 100] })),
			member('gvx', { role: 'core' }),
			member('nrt', tokyo({ point: [102, 100] })),
			member('hnd', tokyo({ point: [101, 103] })),
		]);
		expect(sites.map((site) => site.key)).toEqual(['tokyo', 'gvx']);
		expect(sites[0]?.members.map((one) => one.code)).toEqual(['tyo', 'nrt', 'hnd']);
		expect(sites[0]?.point).toEqual([101, 101]);
		expect(sites[1]?.members.map((one) => one.code)).toEqual(['gvx']);
	});

	it('sums memory and apps running over what it knows, and takes the busiest CPU', () => {
		const [site] = gather([
			member('tyo', tokyo({ memory: 23 * GIB, apps: { running: 9, total: 9 }, cpu: 1.8 })),
			member('nrt', tokyo({ memory: GIB, apps: { running: 6, total: 7 }, cpu: 3.9 })),
			member('hnd', tokyo({ memory: undefined, apps: undefined, cpu: undefined })),
		]);
		expect(site?.memory).toBe(24 * GIB);
		expect(site?.apps).toBe(15);
		expect(site?.cpu).toBe(3.9);
	});

	it('knows nothing of a place none of whose nodes says', () => {
		const [site] = gather([
			member('tyo', tokyo({ memory: undefined, apps: undefined, cpu: undefined })),
		]);
		expect([site?.memory, site?.apps, site?.cpu]).toEqual([undefined, undefined, undefined]);
	});

	it('takes the worst of its nodes, gone over leaving over heard', () => {
		expect(place('live', 'late')).toBe('live');
		expect(place('live', 'upgrading')).toBe('leaving');
		expect(place('restarting', 'upgrading', 'gone')).toBe('gone');
		expect(place('live', 'waiting')).toBe('waiting');
		expect(place('waiting', 'restarting')).toBe('leaving');
	});
});

describe('who leads a place', () => {
	it('is a core node before a relay running more', () => {
		const ranked = rank([
			member('nrt', { apps: { running: 30, total: 30 } }),
			member('tyo', { role: 'core', apps: { running: 2, total: 2 } }),
		]);
		expect(ranked.map((one) => one.code)).toEqual(['tyo', 'nrt']);
	});

	it('is the one running more within a role, then the first in node order', () => {
		const ranked = rank([
			member('a', { apps: { running: 3, total: 3 } }),
			member('b', { apps: { running: 9, total: 9 } }),
			member('c', { apps: { running: 3, total: 3 } }),
			member('d', { apps: undefined }),
		]);
		expect(ranked.map((one) => one.code)).toEqual(['b', 'a', 'c', 'd']);
	});
});

describe('what a node is called', () => {
	it('is its city and its country', () => {
		expect(displayName('Tokyo', 'Japan')).toEqual({
			full: 'Tokyo, Japan',
			short: 'Tokyo, Japan',
			lead: 'Tokyo',
		});
	});

	it('writes the United States and the United Kingdom whole, and short beside', () => {
		expect(displayName('Raleigh', 'United States')).toEqual({
			full: 'Raleigh, United States',
			short: 'Raleigh, US',
			lead: 'Raleigh',
		});
		expect(displayName('London', 'United Kingdom')).toMatchObject({
			full: 'London, United Kingdom',
			short: 'London, UK',
		});
	});

	it('names a member of the European Union by its country and the union', () => {
		expect(displayName('Gävle', 'Sweden')).toEqual({
			full: 'Sweden, European Union',
			short: 'Sweden, EU',
			lead: 'Sweden',
		});
		expect(displayName('Luxembourg', 'Luxembourg')).toMatchObject({
			full: 'Luxembourg, European Union',
			lead: 'Luxembourg',
		});
	});

	it('writes the country alone where the city has its name', () => {
		expect(displayName('Singapore', 'Singapore')).toMatchObject({ full: 'Singapore' });
	});

	it('names every node, shared names and all, and a code it does not place by itself', () => {
		expect(['tyo', 'nrt', 'hnd'].map((code) => nameOf(code).full)).toEqual([
			'Tokyo, Japan',
			'Tokyo, Japan',
			'Tokyo, Japan',
		]);
		expect(['gvx', 'bru', 'buf', 'rdu', 'sha'].map((code) => nameOf(code).full)).toEqual([
			'Sweden, European Union',
			'Belgium, European Union',
			'Buffalo, United States',
			'Raleigh, United States',
			'Shanghai, China',
		]);
		expect(nodeLabel('hnd')).toBe('Tokyo, Japan (hnd)');
		expect(nodeLabel('gvx', 'lead')).toBe('Sweden (gvx)');
		expect(nodeLabel('xyz')).toBe('xyz');
		expect(Object.keys(PLACES).length).toBe(9);
	});
});

describe('the node a relay is nearest', () => {
	it('is the one it timed the least round trip to', () => {
		expect(nearestOf({ nrt: 0.0021, sin: 0.068, hnd: 0.0004 })).toEqual({
			code: 'hnd',
			seconds: 0.0004,
		});
	});

	it('is none where it has timed no other lately', () => {
		expect(nearestOf({})).toBeUndefined();
		expect(nearestOf(undefined)).toBeUndefined();
	});
});

describe('the places the registry gives the nodes', () => {
	afterEach(() => learnPlaces(PLACED));

	it('reads the city first, the country last, and the part between them', () => {
		expect(PLACES.hnd).toEqual({
			place: 'Tokyo, Haneda',
			city: 'Tokyo',
			country: 'Japan',
			role: 'relay',
			cluster: 'tokyo',
		});
		expect(PLACES.tyo).toMatchObject({ place: 'Tokyo', role: 'core', cluster: 'tokyo' });
		expect(PLACES.rdu).toEqual({
			place: 'Raleigh',
			city: 'Raleigh',
			country: 'United States',
			role: 'home',
		});
	});

	it('names a node by its code, a relay, until the registry has placed it', () => {
		learnPlaces({});
		expect(PLACES.tyo).toEqual({ place: 'tyo', city: 'tyo', country: 'tyo', role: 'relay' });
		expect([nameOf('tyo').full, nodeLabel('tyo')]).toEqual(['tyo', 'tyo']);
		learnPlaces({ ...PLACED, sin: { core: true, place: 'Singapore' } });
		expect(PLACES.sin.city).toBe('sin');
	});

	it('gathers nodes into one mark only where they share a city', () => {
		learnPlaces({ ...PLACED, hnd: { ...PLACED.hnd, place: 'Osaka, Japan', core: false } });
		expect(PLACES.hnd.cluster).toBeUndefined();
		expect([PLACES.tyo.cluster, PLACES.nrt.cluster]).toEqual(['tokyo', 'tokyo']);
	});
});
