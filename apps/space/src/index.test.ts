import { describe, expect, it } from 'vitest';
import app from './index.ts';

/** A part's binding that answers with its own name, so a test sees where a path was sent. */
const part = (name: string) => ({ fetch: async () => new Response(name) });
const env = (dev: boolean) => ({
	DESIGN: part('design'),
	RFCS: part('rfcs'),
	...(dev ? { DEV: '1' } : {}),
});

describe('the router', () => {
	it('sends a published part on in production and keeps an unpublished one out', async () => {
		expect(await (await app.request('/design/color', {}, env(false))).text()).toBe('design');
		expect((await app.request('/rfcs/', {}, env(false))).status).toBe(404);
		expect((await app.request('/rfcs/2ut6h', {}, env(false))).status).toBe(404);
	});

	it('sends every part on in development', async () => {
		expect(await (await app.request('/rfcs/', {}, env(true))).text()).toBe('rfcs');
	});

	it('sends the root to the site, saying where from', async () => {
		const response = await app.request('/', {}, env(false));
		expect(response.status).toBe(302);
		expect(new URL(response.headers.get('location')!).searchParams.get('ref')).toBe('app');
	});
});
