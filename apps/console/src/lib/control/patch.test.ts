import { describe, expect, it } from 'vitest';
import { applied, patchOf, same } from './patch.ts';

describe('a merge patch', () => {
	const before = {
		placements: ['tyo', 'sin'],
		release: { repository: 'canmi21/platform', run: 1, commit: 'a' },
		retired: false,
	};

	it('carries only what changed, null for a key taken out', () => {
		const after = {
			placements: ['tyo', 'sin'],
			release: { repository: 'canmi21/platform', run: 2, commit: 'a' },
		};
		expect(patchOf(before, after)).toEqual({ release: { run: 2 }, retired: null });
	});

	it('sends a list whole, since RFC 7386 merges no list', () => {
		expect(patchOf(before, { ...before, placements: ['tyo'] })).toEqual({ placements: ['tyo'] });
	});

	it('is empty where nothing changed, whatever order the keys were written in', () => {
		const reordered = {
			retired: false,
			release: { commit: 'a', run: 1, repository: 'canmi21/platform' },
			placements: ['tyo', 'sin'],
		};
		expect(patchOf(before, reordered)).toEqual({});
	});

	it('takes the spec it was made from to the one it was made for', () => {
		const after = {
			placements: ['rdu'],
			release: { repository: 'canmi21/web', run: 9, commit: 'b' },
			note: 'x',
		};
		expect(same(applied(before, patchOf(before, after)), after)).toBe(true);
	});

	it('sets a value whole where the patch is not an object, and leaves its inputs as they were', () => {
		const target = { a: { b: 1 } };
		expect(applied(target, { a: 2 })).toEqual({ a: 2 });
		expect(applied(target, { a: { c: 1, b: null } })).toEqual({ a: { c: 1 } });
		expect(target).toEqual({ a: { b: 1 } });
	});
});
