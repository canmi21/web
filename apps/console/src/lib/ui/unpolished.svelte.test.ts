import { createRawSnippet } from 'svelte';
import { render } from 'svelte/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import Unpolished from './unpolished.svelte';

const children = createRawSnippet(() => ({ render: () => '<p>the surface</p>' }));
const draw = () => render(Unpolished, { props: { rfc: '8pqao', children } }).body;

describe('unpolished', () => {
	afterEach(() => vi.unstubAllEnvs());

	it('marks the surface and tags it with its RFC in development', () => {
		vi.stubEnv('DEV', true);
		const body = draw();
		expect(body).toContain('data-unpolished="8pqao"');
		expect(body).toContain('RFC 8pqao');
		expect(body).toContain('<p>the surface</p>');
	});

	it('adds nothing in production', () => {
		vi.stubEnv('DEV', false);
		const body = draw();
		expect(body).toContain('<p>the surface</p>');
		expect(body).not.toContain('unpolished');
		expect(body).not.toContain('8pqao');
		expect(body.replace(/<!--[^>]*-->/g, '')).toBe('<p>the surface</p>');
	});
});
