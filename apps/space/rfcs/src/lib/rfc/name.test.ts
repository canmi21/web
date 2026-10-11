import { describe, expect, it } from 'vitest';
import { formatName, newId, parseName, rfcPath, slugOf, today } from './name.ts';

describe('parseName', () => {
	it('reads the day, the place, the slug and the id', () => {
		expect(parseName('2026-1011-01-rfc-format-2ut6h.md')).toEqual({
			day: '2026-1011',
			order: 1,
			slug: 'rfc-format',
			id: '2ut6h',
		});
	});

	it('refuses a day that does not exist, a place of zero, and a short id', () => {
		expect(parseName('2026-0230-01-x-abcde.md')).toBeUndefined();
		expect(parseName('2026-1011-00-x-abcde.md')).toBeUndefined();
		expect(parseName('2026-1011-1-x-abcde.md')).toBeUndefined();
		expect(parseName('2026-1011-01-x-abcd.md')).toBeUndefined();
		expect(parseName('2026-1011-01-X-abcde.md')).toBeUndefined();
	});

	it('round-trips through formatName', () => {
		const name = { day: '2026-1011', order: 12, slug: 'hue-pairs', id: 'k3x9q' };
		expect(parseName(formatName(name))).toEqual(name);
	});
});

describe('today', () => {
	it('writes the local day as a file names it', () => {
		expect(today(new Date(2026, 9, 11, 23, 59))).toBe('2026-1011');
		expect(today(new Date(2026, 0, 2))).toBe('2026-0102');
	});
});

describe('newId', () => {
	it('draws again past the alphabet and around a taken id', () => {
		const bytes = [255, 0, 1, 2, 3, 4, 0, 1, 2, 3, 5];
		const random = (array: Uint8Array) => {
			array[0] = bytes.shift()!;
			return array;
		};
		expect(newId(new Set(['abcde']), random as typeof crypto.getRandomValues)).toBe('abcdf');
	});
});

describe('rfcPath', () => {
	it('is the area, then the slug and the id', () => {
		expect(rfcPath('design', { slug: 'hue-pairs', id: 'k3x9q' })).toBe(
			'/rfcs/design/hue-pairs-k3x9q',
		);
	});
});

describe('slugOf', () => {
	it('is the name in lowercase words joined by hyphens', () => {
		expect(slugOf('RFC Format')).toBe('rfc-format');
		expect(slugOf("  Hue Pairs, Dark's First ")).toBe('hue-pairs-dark-s-first');
	});
});
