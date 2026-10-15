import { render } from 'svelte/server';
import { describe, expect, it } from 'vitest';
import PlaceCard from './place-card.svelte';
import type { Member, Site } from './places.ts';
import { ID, PLACED } from '../server/nodes.fixture.ts';
import { learnPlaces } from './places.ts';

// Where control places each node; see RFC 17b3o.
learnPlaces(PLACED);

const NOW = Date.parse('2026-10-06T12:00:00Z');
const GIB = 2 ** 30;
const member = (code: string, overrides: Partial<Member> = {}): Member => ({
	code,
	role: 'relay',
	cluster: 'tokyo',
	state: 'live',
	apps: { running: 7, total: 7 },
	memory: GIB,
	used: GIB / 2,
	cpu: 1.5,
	heard: '2026-10-06T11:59:58Z',
	point: [0, 0],
	...overrides,
});
const site = (members: Member[], overrides: Partial<Site> = {}): Site => ({
	key: members.length > 1 ? 'tokyo' : (members[0]?.code ?? ''),
	members,
	point: [0, 0],
	memory: undefined,
	apps: undefined,
	cpu: undefined,
	state: 'live',
	...overrides,
});

describe('a place card on the server', () => {
	it('reads a shared place across: rows named at the left, a close column a city', () => {
		const members = [
			member(ID.tyo, { role: 'core', apps: { running: 9, total: 9 }, cpu: 1.8 }),
			member(ID.nrt, { cpu: 3.96, booted: NOW / 1000 - 3 * 86_400 }),
			member(ID.hnd, { state: 'gone', cpu: undefined }),
		];
		const { body } = render(PlaceCard, {
			props: { site: site(members, { memory: 25.4 * GIB, apps: 21, state: 'gone' }), now: NOW },
		});
		// The country in the corner, over the rows' names; no title above the table.
		expect(body).toMatch(
			/<th scope="col"[^>]*>(?:(?!<\/th>).)*<img[^>]*>(?:(?!<\/th>).)*>Japan<\/span>/,
		);
		expect(body).not.toContain('Tokyo, Japan<');
		for (const code of [ID.tyo, ID.nrt, ID.hnd]) {
			expect(body).toMatch(new RegExp(`href="/nodes/${code}"[^>]*data-row="${code}"`));
		}
		for (const part of ['Tokyo (d132)', 'Tokyo (055d)', 'Tokyo (26bf)']) {
			expect(body).toContain(`>${part}</a>`);
		}
		for (const row of ['Uptime', 'Role', 'Apps', 'CPU', 'RAM', 'Latency']) {
			expect(body.match(new RegExp(`${row}(?:<!---->)?</th>`, 'g'))).toHaveLength(1);
		}
		expect(body).toContain('3d 0h');
		expect(body).toContain('Not heard');
		expect(body).toContain('9/9');
		expect(body).toContain('0.5G');
		// The id is the key, never the name; only its first digits tell the three apart.
		expect(body).not.toMatch(new RegExp(`(${ID.tyo}|${ID.nrt}|${ID.hnd})<`));
	});

	it('says why a leaving node is away where its uptime stood, never that it is not heard', () => {
		const members = [
			member(ID.tyo, { state: 'upgrading', booted: NOW / 1000 - 86_400 }),
			member(ID.nrt, { state: 'restarting' }),
			member(ID.hnd, { state: 'late', booted: NOW / 1000 - 3600 }),
		];
		const { body } = render(PlaceCard, {
			props: { site: site(members, { state: 'leaving' }), now: NOW },
		});
		expect(body).toContain('Upgrading');
		expect(body).toContain('Restarting');
		expect(body).toContain('1h 0m');
		expect(body).not.toContain('Not heard');
		expect(body).not.toContain('1d 0h');
	});

	it('times each node to its nearest, named by its city in the title, and none untimed', () => {
		const members = [
			member(ID.tyo, { latency: 0.42, nearest: ID.nrt }),
			member(ID.nrt, { latency: 151.3, nearest: ID.sin }),
			member(ID.hnd),
		];
		const { body } = render(PlaceCard, { props: { site: site(members), now: NOW } });
		expect(body).toContain('0.4ms');
		expect(body).toContain('151ms');
		expect(body).toContain('title="Round trip to Tokyo, Japan (055d), the nearest node"');
		expect(body).toContain('title="Round trip to Singapore, the nearest node"');
		expect(body).toContain('title="No node timed lately"');
		expect(body).not.toContain('Primary');
	});

	it('lists a node alone by uptime, role, apps and two rings, with no state or clock', () => {
		const lone = member(ID.gvx, { cluster: undefined, role: 'core' });
		const { body } = render(PlaceCard, { props: { site: site([lone]), now: NOW } });
		expect(body).toContain('Sweden, European Union');
		// The name is the country's and the union's; the card adds no city to it.
		expect(body).not.toContain('Gävle');
		for (const row of ['Uptime', 'Role', 'Apps', 'CPU', 'RAM', 'Latency']) {
			expect(body).toMatch(new RegExp(`</svg>(?:<!--[^>]*-->)*${row}(?:<!---->)?</dt>`));
		}
		expect(body).toContain('1.5%');
		expect(body).toContain('0.5G');
		for (const gone of ['Status', 'Heard', 'CPU now', 'Memory used', `>${ID.gvx}<`]) {
			expect(body).not.toContain(gone);
		}
		expect(body).not.toContain('data-row');
	});
});
