import { describe, expect, it } from 'vitest';
import { chainOf, checkBlockers, cycles, ready, type Graph } from './graph.ts';
import type { Status } from './record.ts';

const graph = (nodes: Record<string, [Status, string[]?]>): Graph =>
	new Map(
		Object.entries(nodes).map(([id, [status, blockedBy = []]]) => [id, { status, blockedBy }]),
	);

describe('cycles', () => {
	it('finds none in a chain, and a loop however long', () => {
		expect(cycles(graph({ a: ['draft', ['b']], b: ['draft', ['c']], c: ['landed'] }))).toEqual([]);
		expect(
			cycles(graph({ a: ['draft', ['b']], b: ['draft', ['c']], c: ['draft', ['a']] })),
		).toEqual([['a', 'b', 'c', 'a']]);
	});
});

describe('checkBlockers', () => {
	it('refuses an unknown blocker, itself, an open one under a landed RFC, a declined one', () => {
		const nodes = graph({
			a: ['landed', ['b']],
			b: ['accepted'],
			c: ['draft', ['d', 'c', 'zzzzz']],
			d: ['declined'],
		});
		expect(checkBlockers('a', nodes)).toEqual(['landed while b, which blocks it, is accepted']);
		expect(checkBlockers('c', nodes)).toEqual([
			'is blocked by d, which was declined; drop it',
			'is blocked by itself',
			'is blocked by zzzzz, which no RFC holds',
		]);
	});
});

describe('ready and chainOf', () => {
	const nodes = graph({
		a: ['accepted'],
		b: ['draft', ['a']],
		c: ['draft', ['b', 'x']],
		x: ['landed'],
		d: ['accepted', ['x']],
	});

	it('takes up what nothing open blocks', () => {
		expect(ready(nodes).map(([id]) => id)).toEqual(['a', 'd']);
	});

	it('reads the longest chain of open RFCs ahead of one', () => {
		expect(chainOf('c', nodes)).toEqual(['a', 'b', 'c']);
	});
});
