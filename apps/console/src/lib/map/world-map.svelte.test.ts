import { render } from 'svelte/server';
import { describe, expect, it } from 'vitest';
import { DOTS } from './land.generated.ts';
import WorldMap from './world-map.svelte';
import type { Held } from '../wire.ts';
import { ID, PLACED } from '../server/nodes.fixture.ts';
import { learnPlaces } from './places.ts';

// Where control places each node; see RFC 17b3o.
learnPlaces(PLACED);

const NOW = Date.parse('2026-10-06T12:00:00Z');
const PLACES = ['tokyo', ID.sin, ID.gvx, ID.buf, ID.bru, ID.rdu, ID.sha];

function held(secondsAgo: number, cpu?: number, gib?: number): Held {
	return {
		version: 1,
		heard_at: new Date(NOW - secondsAgo * 1000).toISOString(),
		snapshot: {
			taken_at: '2026-10-06T12:00:00Z',
			apps: [{ name: 'geo', image: 'geo:1', deployed_at: '', running: true, held: false }],
			machine:
				cpu === undefined && gib === undefined
					? undefined
					: {
							info: gib === undefined ? {} : { memory: gib * 2 ** 30 },
							sample: {
								values: {
									...(cpu === undefined ? {} : { 'cpu.usage': cpu }),
									'memory.used': 2 ** 29,
								},
							},
						},
		},
	};
}

/** What is held of a node, its state as the relay says it. */
const said = (secondsAgo: number, state: Held['state']): Held => ({ ...held(secondsAgo), state });

/** Each place's mark, from its link to the link's end. */
const marks = (body: string) =>
	Object.fromEntries(
		body
			.split('data-place="')
			.slice(1)
			.map((mark) => [mark.slice(0, mark.indexOf('"')), mark.split('</a>')[0] ?? '']),
	);

describe('world map on the server', () => {
	const states = {
		[ID.tyo]: held(2, 1, 1),
		[ID.nrt]: held(2, 15, 1.5),
		[ID.hnd]: held(2, undefined, 6),
		[ID.gvx]: held(30, undefined, 1),
		[ID.buf]: held(300, undefined, 3),
	};

	it('draws the land as dots and one mark per place, with no name and no line', () => {
		const { body } = render(WorldMap, { props: { states, now: NOW } });
		expect(body).toMatch(/<svg[^>]*viewBox="0 0 1000 670"/);
		expect(body).toContain(`d="${DOTS}"`);
		expect(body).toContain('stroke-dasharray="4 6"');
		expect(Object.keys(marks(body))).toEqual(PLACES);
		const land = /<svg[^>]*viewBox="0 0 1000 670"[\s\S]*?<\/svg>/.exec(body)?.[0] ?? '';
		expect(land.match(/<path/g)).toHaveLength(1);
		expect(body).not.toContain('<line');
		expect(body).not.toMatch(new RegExp(`>(${ID.tyo}|${ID.gvx}|Tokyo)</span>`));
	});

	it("merges Tokyo's three into one mark that opens the node leading it", () => {
		const { body } = render(WorldMap, { props: { states, now: NOW } });
		const tokyo = marks(body).tokyo ?? '';
		expect(body).toContain(`href="/nodes/${ID.tyo}" data-place="tokyo"`);
		expect(tokyo).toContain('aria-label="Tokyo, Japan, 3 nodes, live"');
		expect(body).not.toContain(`data-node="${ID.nrt}"`);
		expect(body).not.toContain(`data-node="${ID.hnd}"`);
	});

	it('draws what the relay says over what its clock would, a leaving place amber', () => {
		const by = marks(
			render(WorldMap, {
				props: {
					states: {
						...states,
						[ID.hnd]: said(2, 'upgrading'),
						[ID.buf]: said(300, 'live'),
						[ID.rdu]: { state: 'waiting' },
					},
					now: NOW,
				},
			}).body,
		);
		expect(by.tokyo).toContain('data-state="leaving"');
		expect(by.tokyo).toContain('aria-label="Tokyo, Japan, 3 nodes, leaving"');
		expect(by.tokyo).not.toContain('data-halo');
		expect(by[ID.buf]).toContain('data-state="live"');
		expect(by[ID.rdu]).toContain('data-state="waiting"');
	});

	it('reads a relay that sends no state by its clock, a late node heard, gone if any is', () => {
		const by = marks(render(WorldMap, { props: { states, now: NOW } }).body);
		expect(by.tokyo).toContain('data-state="live"');
		expect(by[ID.gvx]).toContain('data-state="live"');
		expect(by[ID.buf]).toContain('data-state="gone"');
		expect(by[ID.rdu]).toContain('data-state="gone"');
		const { [ID.hnd]: _, ...without } = states;
		const missing = marks(render(WorldMap, { props: { states: without, now: NOW } }).body);
		expect(missing.tokyo).toContain('data-state="gone"');
		expect(missing.tokyo).not.toContain('data-halo');
	});

	it('sizes each mark by the memory at its place, the middle size where it is not known', () => {
		const by = marks(render(WorldMap, { props: { states, now: NOW } }).body);
		// Tokyo: 1 + 1.5 + 6 GiB, past 8.
		expect(by.tokyo).toContain('data-radius="12"');
		expect(by[ID.gvx]).toContain('data-radius="7"');
		expect(by[ID.gvx]).toContain('width: 1.4cqw');
		expect(by[ID.buf]).toContain('data-radius="9.5"');
		expect(by[ID.rdu]).toContain('data-radius="9.5"');
	});

	it('fills every mark as deep as its place runs, a gone one too', () => {
		const by = marks(render(WorldMap, { props: { states, now: NOW, compact: true } }).body);
		expect(by.tokyo).toContain('style="opacity: 0.45;"');
		expect(by[ID.buf]).toContain('style="opacity: 0.45;"');
		expect(by[ID.rdu]).toContain('style="opacity: 0.72;"');
	});

	it('breathes a halo behind each heard mark, as fast as its busiest node', () => {
		const by = marks(render(WorldMap, { props: { states, now: NOW } }).body);
		expect(by.tokyo).toMatch(/data-halo[^>]*animation-duration: 1.6s/);
		expect(by[ID.gvx]).toMatch(/data-halo[^>]*animation-duration: 4s/);
		expect(by[ID.buf]).not.toContain('data-halo');
		expect(by[ID.rdu]).not.toContain('data-halo');
		const delays = Object.values(by).map((mark) => /animation-delay: ([^;"]+)/.exec(mark)?.[1]);
		expect(new Set(delays.filter(Boolean)).size).toBe(2);
	});

	it('raises the place of the selected node, and draws no links', () => {
		const by = marks(render(WorldMap, { props: { states, now: NOW, selected: ID.nrt } }).body);
		expect(by.tokyo).toContain('z-index: 10');
		expect(by[ID.gvx]).not.toContain('z-index');
	});

	it('starts flat, the globe offered and not drawn', () => {
		const { body } = render(WorldMap, { props: { states, now: NOW } });
		expect(body).toContain('aria-label="Map view"');
		// Each option is an icon, its name said to assistive technology alone.
		const [flat = '', globe = ''] = body.split('role="radio"').slice(1);
		expect(flat).toMatch(/^[^>]*aria-checked="true"/);
		expect(flat).toContain('sr-only">Map<');
		expect(globe).toMatch(/^[^>]*aria-checked="false"/);
		expect(globe).toContain('sr-only">Globe<');
		expect(body).not.toContain('<canvas');
		expect(body).not.toContain('The nodes on a globe');
	});

	it('leaves the card and globe out of a compact map', () => {
		const { body } = render(WorldMap, { props: { states, now: NOW, compact: true } });
		expect(Object.keys(marks(body))).toEqual(PLACES);
		expect(body).not.toContain('role="tooltip"');
		expect(body).not.toContain('Map view');
	});
});
