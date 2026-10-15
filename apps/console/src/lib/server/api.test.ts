import { pathOf } from '@canmi/addresses';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('$app/env', () => ({ dev: false }));
// Every read throws, as a binding that breaks mid-read does.
vi.mock('./sources.ts', () => ({
	sourcesOf: () => ({
		history: () => Promise.reject(new Error('the binding broke')),
	}),
}));

// The relay's stream as the nodes would answer it.
vi.mock('./edge.ts', async (actual) => ({
	...(await actual<typeof import('./edge.ts')>()),
	openLive: vi.fn(),
}));

const { default: app } = await import('./api.ts');
const { openLive } = await import('./edge.ts');
const { ASKED, PREFIX } = await import('../facets.ts');

describe('the API', () => {
	afterEach(() => vi.restoreAllMocks());

	it('answers a thrown read in the envelope, uncached', async () => {
		const logged = vi.spyOn(console, 'error').mockImplementation(() => {});
		const answer = await app.request('/api/history?span=1h', {}, {});
		expect(answer.status).toBe(500);
		expect(answer.headers.get('content-type')).toMatch(/^application\/json/);
		expect(answer.headers.get('cache-control')).toBe('no-store');
		expect(await answer.json()).toEqual({
			status: 'error',
			code: 'service_unavailable',
			message: expect.any(String),
		});
		expect(logged).toHaveBeenCalledOnce();
	});

	it("answers the live stream as the relay's own response, never a copy", async () => {
		const upstream = new Response('data: {"type":"cluster"}\n\n', {
			headers: { 'content-type': 'text/event-stream', 'content-encoding': 'zstd' },
		});
		vi.mocked(openLive).mockResolvedValue(upstream);
		const path = pathOf(ASKED, PREFIX, 'live');
		const answer = await app.request(path, { headers: { accept: 'text/event-stream' } }, {});
		expect(answer).toBe(upstream);
		expect(answer.headers.has('x-powered-by')).toBe(false);
	});

	it('names Hono on every other answer', async () => {
		const answer = await app.request('/elsewhere', {}, {});
		expect(answer.headers.get('x-powered-by')).toBe('Hono');
	});

	it('answers an address it has no route for in the envelope', async () => {
		const answer = await app.request('/elsewhere', {}, {});
		expect(answer.status).toBe(404);
		expect(await answer.json()).toMatchObject({ status: 'error', code: 'no_such_route' });
	});
});
