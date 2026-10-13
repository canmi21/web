import { describe, expect, it } from 'vitest';
import type { Now } from '../host.ts';
import type { Env } from './edge.ts';
import { NODES } from './nodes.ts';
import { cluster, node } from './read.ts';

/** Bindings that fail the test if anything is asked of them. */
const untouched = new Proxy({} as Env, {
	get: (_, name) =>
		name === 'HOST_READ_TOKEN' ? 'read-token' : { fetch: () => expect.unreachable() },
});

describe('mock mode', () => {
	const edge = { env: untouched, mock: true };

	it('answers every read with made-up data, shaped as the real answer is', async () => {
		const state = await cluster(edge);
		expect(state.ok && Object.keys(state.data.nodes).sort()).toEqual(Object.keys(NODES).sort());
		const now = await node<Now>(edge, 'tyo', '/node/now');
		expect(now.ok && typeof now.data.sample.values['cpu.usage']).toBe('number');
	});

	it('answers a path nothing is made up for as no such route', async () => {
		const read = await node(edge, 'tyo', '/nothing');
		expect(!read.ok && read.failure.code).toBe('no_such_route');
	});
});
