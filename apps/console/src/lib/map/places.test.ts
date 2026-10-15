import { afterEach, describe, expect, it } from 'vitest';
import {
	displayName,
	gather,
	type Member,
	nameOf,
	nearestOf,
	nodeLabel,
	partOf,
	PLACES,
	rank,
	learnPlaces,
} from './places.ts';
import { ID, PLACED } from '../server/nodes.fixture.ts';

// Where control places each node; see RFC 17b3o.
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
		states.map((state, index) => member([ID.tyo, ID.nrt, ID.hnd][index] ?? '', tokyo({ state }))),
	)[0]?.state;

describe('the marks the nodes gather into', () => {
	it('draws the nodes of one place as one mark, and a node alone as its own', () => {
		const sites = gather([
			member(ID.tyo, tokyo({ role: 'core', point: [100, 100] })),
			member(ID.gvx, { role: 'core' }),
			member(ID.nrt, tokyo({ point: [102, 100] })),
			member(ID.hnd, tokyo({ point: [101, 103] })),
		]);
		expect(sites.map((site) => site.key)).toEqual(['tokyo', ID.gvx]);
		expect(sites[0]?.members.map((one) => one.code)).toEqual([ID.tyo, ID.nrt, ID.hnd]);
		expect(sites[0]?.point).toEqual([101, 101]);
		expect(sites[1]?.members.map((one) => one.code)).toEqual([ID.gvx]);
	});

	it('sums memory and apps running over what it knows, and takes the busiest CPU', () => {
		const [site] = gather([
			member(ID.tyo, tokyo({ memory: 23 * GIB, apps: { running: 9, total: 9 }, cpu: 1.8 })),
			member(ID.nrt, tokyo({ memory: GIB, apps: { running: 6, total: 7 }, cpu: 3.9 })),
			member(ID.hnd, tokyo({ memory: undefined, apps: undefined, cpu: undefined })),
		]);
		expect(site?.memory).toBe(24 * GIB);
		expect(site?.apps).toBe(15);
		expect(site?.cpu).toBe(3.9);
	});

	it('knows nothing of a place none of whose nodes says', () => {
		const [site] = gather([
			member(ID.tyo, tokyo({ memory: undefined, apps: undefined, cpu: undefined })),
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
			member(ID.nrt, { apps: { running: 30, total: 30 } }),
			member(ID.tyo, { role: 'core', apps: { running: 2, total: 2 } }),
		]);
		expect(ranked.map((one) => one.code)).toEqual([ID.tyo, ID.nrt]);
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

	it('names every node, shared names and all, and an id it does not place by its first digits', () => {
		expect([ID.tyo, ID.nrt, ID.hnd].map((code) => nameOf(code).full)).toEqual([
			'Tokyo, Japan',
			'Tokyo, Japan',
			'Tokyo, Japan',
		]);
		expect([ID.gvx, ID.bru, ID.buf, ID.rdu, ID.sha].map((code) => nameOf(code).full)).toEqual([
			'Sweden, European Union',
			'Belgium, European Union',
			'Buffalo, United States',
			'Raleigh, United States',
			'Shanghai, China',
		]);
		expect(nameOf('ffffffffffffffff').full).toBe('ffff');
		expect(Object.keys(PLACES).length).toBe(9);
	});

	it('writes a short id beside a name only where another node shares it', () => {
		expect(nodeLabel(ID.hnd)).toBe('Tokyo, Japan (26bf)');
		expect(nodeLabel(ID.tyo, 'lead')).toBe('Tokyo (d132)');
		expect(nodeLabel(ID.gvx, 'lead')).toBe('Sweden');
		expect(nodeLabel(ID.sin)).toBe('Singapore');
		expect(nodeLabel('ffffffffffffffff')).toBe('ffff');
	});

	it('tells a node from the others in its city by its short id', () => {
		expect([ID.tyo, ID.nrt, ID.hnd].map(partOf)).toEqual([
			'Tokyo (d132)',
			'Tokyo (055d)',
			'Tokyo (26bf)',
		]);
		expect(partOf(ID.gvx)).toBe('Gävle');
	});
});

describe('the node a relay is nearest', () => {
	it('is the one it timed the least round trip to', () => {
		expect(nearestOf({ [ID.nrt]: 0.0021, [ID.sin]: 0.068, [ID.hnd]: 0.0004 })).toEqual({
			code: ID.hnd,
			seconds: 0.0004,
		});
	});

	it('is none where it has timed no other lately', () => {
		expect(nearestOf({})).toBeUndefined();
		expect(nearestOf(undefined)).toBeUndefined();
	});
});

describe('the places control gives the nodes', () => {
	afterEach(() => learnPlaces(PLACED));

	it('reads the city, and the country in full from its two letters', () => {
		expect(PLACES[ID.hnd]).toEqual({
			place: 'Tokyo',
			city: 'Tokyo',
			country: 'Japan',
			iso: 'JP',
			role: 'relay',
			cluster: 'tokyo',
		});
		expect(PLACES[ID.tyo]).toMatchObject({ place: 'Tokyo', role: 'core', cluster: 'tokyo' });
		expect(PLACES[ID.rdu]).toEqual({
			place: 'Raleigh',
			city: 'Raleigh',
			country: 'United States',
			iso: 'US',
			role: 'home',
		});
	});

	it('names a node by its short id, a relay, until control has placed it', () => {
		learnPlaces({});
		expect(PLACES[ID.tyo]).toEqual({ place: 'd132', city: 'd132', country: 'd132', role: 'relay' });
		expect([nameOf(ID.tyo).full, nodeLabel(ID.tyo)]).toEqual(['d132', 'd132']);
		learnPlaces({ ...PLACED, [ID.sin]: { core: true, city: 'Singapore' } });
		expect(PLACES[ID.sin].city).toBe('9d39');
	});

	it('gathers nodes into one mark only where they share a city', () => {
		learnPlaces({ ...PLACED, [ID.hnd]: { ...PLACED[ID.hnd], city: 'Osaka', core: false } });
		expect(PLACES[ID.hnd].cluster).toBeUndefined();
		expect([PLACES[ID.tyo].cluster, PLACES[ID.nrt].cluster]).toEqual(['tokyo', 'tokyo']);
	});
});
