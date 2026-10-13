import { describe, expect, it, vi } from 'vitest';
import type { Now } from '../host.ts';
import { NODES } from './nodes.ts';
import { cluster, node } from './read.ts';

/** No node bound, so every read fails as an unreachable one does. */
const unbound = { env: { HOST_READ_TOKEN: 'read-token' } };

describe('a read no node answers', () => {
	vi.spyOn(console, 'error').mockImplementation(() => {});

	it('fails, outside development', async () => {
		expect((await cluster(unbound)).ok).toBe(false);
		expect((await node(unbound, 'tyo', '/node/now')).ok).toBe(false);
	});

	it('is made up in development, shaped as the real answer is', async () => {
		const state = await cluster({ ...unbound, mock: true });
		expect(state.ok && Object.keys(state.data.nodes).sort()).toEqual(Object.keys(NODES).sort());
		const now = await node<Now>({ ...unbound, mock: true }, 'tyo', '/node/now');
		expect(now.ok && typeof now.data.sample.values['cpu.usage']).toBe('number');
	});

	it('stays failed where nothing is made up for its path', async () => {
		expect((await node({ ...unbound, mock: true }, 'tyo', '/nothing')).ok).toBe(false);
	});
});
