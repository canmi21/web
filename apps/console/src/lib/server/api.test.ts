import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('$app/env', () => ({ dev: false }));
// Every read throws, as a binding that breaks mid-read does.
vi.mock('./sources.ts', () => ({
	sourcesOf: () => ({
		history: () => Promise.reject(new Error('the binding broke')),
	}),
}));

const { default: app } = await import('./api.ts');

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

	it('answers an address it has no route for in the envelope', async () => {
		const answer = await app.request('/elsewhere', {}, {});
		expect(answer.status).toBe(404);
		expect(await answer.json()).toMatchObject({ status: 'error', code: 'no_such_route' });
	});
});
