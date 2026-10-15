import { mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { beside } from './beside.ts';

const roots: string[] = [];
afterEach(() => {
	for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

/** A workspace with web in it and the platform's `apps` beside it, holding `apps`. */
function workspace(...apps: string[]): string {
	const root = mkdtempSync(join(tmpdir(), 'beside-'));
	roots.push(root);
	mkdirSync(join(root, 'web'));
	for (const app of apps) mkdirSync(join(root, 'platform/apps', app), { recursive: true });
	return join(root, 'web');
}

const SCHEMA = '../platform/apps/*/control/catalog.schema.json';

describe('a path beside this checkout', () => {
	it('finds the app whichever group holds it', () => {
		for (const group of ['data', 'control']) {
			const web = workspace(`${group}/control`, 'system/relay');
			expect(beside(SCHEMA, web)).toBe(
				join(web, `../platform/apps/${group}/control/catalog.schema.json`),
			);
		}
	});

	it('is not there where the other checkout is not cloned', () => {
		expect(beside(SCHEMA, workspace())).toBeUndefined();
	});

	it('fails naming the app where no group holds it, or two do', () => {
		expect(() => beside(SCHEMA, workspace('system/relay'))).toThrow(
			'*/control is to be there once',
		);
		expect(() => beside(SCHEMA, workspace('data/control', 'control/control'))).toThrow(
			/control is to be there once, and is .*control\/control, .*data\/control/,
		);
	});

	it('holds one `*` and no more', () => {
		expect(() => beside('../platform/apps/control', workspace())).toThrow('one `/*/`');
		expect(() => beside('../*/apps/*/control', workspace())).toThrow('one `/*/`');
	});
});
