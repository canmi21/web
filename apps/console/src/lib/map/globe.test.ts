import { describe, expect, it } from 'vitest';
import { LAND, place } from './globe.ts';
import { DOTS, LOCATIONS, POINTS } from './land.generated.ts';
import { ID } from '../server/nodes.fixture.ts';

describe('the globe the flat map turns into', () => {
	it('takes every dot the flat map strokes, at its middle', () => {
		const runs = [...DOTS.matchAll(/M(-?[\d.]+) (-?[\d.]+)h([\d.]+)/g)];
		expect(LAND.length).toBeGreaterThan(runs.length);
		const [, x, y] = runs[0] ?? [];
		expect(LAND[0]?.point).toEqual([Number(x) + 2, Number(y)]);
	});

	it('draws a node where the flat map does until it starts to turn', () => {
		const at = place(LOCATIONS[ID.tyo], POINTS[ID.tyo], 0, -30);
		expect(at).toEqual({ x: POINTS[ID.tyo][0], y: POINTS[ID.tyo][1], alpha: 1 });
	});

	it('undoes the flat map: a dot turned to face the reader sits at the globe’s middle', () => {
		const dot = LAND[Math.floor(LAND.length / 2)];
		if (!dot) throw new Error('no land');
		const [latitude, longitude] = dot.location;
		const facing = place([15, longitude], dot.point, 1, longitude);
		expect(facing.x).toBeCloseTo(500, 5);
		expect(latitude).toBeGreaterThan(-90);
		expect(latitude).toBeLessThan(90);
	});

	it('carries a place turned away with the rest, fading it out on the way', () => {
		const away = place(LOCATIONS[ID.tyo], POINTS[ID.tyo], 0.5, LOCATIONS[ID.tyo][1] + 180);
		expect(away.alpha).toBeCloseTo(0.5, 5);
		expect(away.x).not.toBeCloseTo(POINTS[ID.tyo][0], 0);
		expect(place(LOCATIONS[ID.tyo], POINTS[ID.tyo], 1, LOCATIONS[ID.tyo][1] + 180).alpha).toBe(0);
	});
});
