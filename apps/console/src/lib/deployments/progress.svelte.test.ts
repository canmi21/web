import { render } from 'svelte/server';
import { describe, expect, it } from 'vitest';
import { viewedAs } from '../scope/context.ts';
import Matrix from './matrix.svelte';
import Progress from './progress.svelte';
import type { Cell, NodeMark } from './state.ts';
import { ID, PLACED } from '../server/nodes.fixture.ts';
import { learnPlaces } from '../map/places.ts';

// Where control places each node; see RFC 17b3o.
learnPlaces(PLACED);

describe('the progress strip', () => {
	it('fills a running cell as far as its stage, and says every node in words', () => {
		const marks: NodeMark[] = [
			{ node: ID.tyo, mark: 'running', stage: 'draining', placements: 1 },
			{ node: ID.nrt, mark: 'succeeded', placements: 2 },
			{ node: ID.bru, mark: 'absent', placements: 0 },
			{ node: ID.rdu, mark: 'unknown', placements: 0 },
		];
		const { body } = render(Progress, { props: { marks } });
		expect(body).toContain('height: 100%');
		expect(body).toContain(
			'aria-label="Tokyo, Japan (d132) Draining, Tokyo, Japan (055d) Succeeded, Belgium, European Union Not placed, Raleigh, United States Unknown"',
		);
		expect(body.match(/title="/g)).toHaveLength(4);
	});
});

describe('the matrix', () => {
	it('links a placed cell to its node with its reason, and writes the rest plainly', () => {
		const placement = {
			node: ID.tyo,
			app: 'web',
			action: 'deploy',
			outcome: 'failed',
			stage: 'loading',
			detail: 'image digest did not match',
			started_at: '2026-10-05T10:00:00Z',
		};
		const rows: Cell[][] = [
			[
				{ app: 'web', node: ID.tyo, mark: 'failed', placement },
				{ app: 'web', node: ID.bru, mark: 'absent' },
			],
		];
		const { body } = render(Matrix, { props: { rows, nodes: [ID.tyo, ID.bru] } });
		expect(body).toContain(`href="/nodes/${ID.tyo}" title="image digest did not match"`);
		expect(body).toContain('Failed loading');
		expect(body).toContain('Not placed');
		expect(body).not.toContain(`href="/nodes/${ID.bru}"`);
		const scoped = render(Matrix, {
			props: { rows, nodes: [ID.tyo, ID.bru] },
			context: viewedAs('platform'),
		});
		expect(scoped.body).toContain(`href="/infra/nodes/${ID.tyo}"`);
	});

	it('writes a skip left for the operator as by hand, the command on hover', () => {
		const detail = 'mise run node deploy tyo --run 41 --repository platform --app database';
		const placement = {
			node: ID.tyo,
			app: 'database',
			action: 'deploy',
			outcome: 'skipped',
			detail,
			started_at: '2026-10-05T10:00:00Z',
		};
		const rows: Cell[][] = [[{ app: 'database', node: ID.tyo, mark: 'skipped', placement }]];
		const { body } = render(Matrix, { props: { rows, nodes: [ID.tyo] } });
		expect(body).toContain(`title="${detail}"`);
		expect(body).toContain('By hand');
	});
});
