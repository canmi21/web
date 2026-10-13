import { render } from 'svelte/server';
import { describe, expect, it } from 'vitest';
import Flag from './flag.svelte';
import { PLACES } from './places.ts';

describe('flag', () => {
	it('draws one for every node, so a node in a new country fails here until its flag is bundled', () => {
		for (const code of Object.keys(PLACES)) {
			expect(render(Flag, { props: { code } }).body, code).toContain('<img');
		}
	});

	it('draws nothing for a code it does not place', () => {
		expect(render(Flag, { props: { code: 'xyz' } }).body).not.toContain('<img');
	});
});
