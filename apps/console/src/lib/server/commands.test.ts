import { describe, expect, it } from 'vitest';
import { URLS } from '@monoflake/sdk';
import { COMMANDS, crossSite } from './commands.ts';
import { ID } from './nodes.fixture.ts';

describe("a command's body", () => {
	it('is read where it is whole', () => {
		const body = { kind: 'node', ref: ID.tyo, revision: 4, patch: { retired: null } };
		expect(COMMANDS.patch.body(body)).toEqual(body);
		expect(COMMANDS.create.body({ kind: 'app', name: 'shot', spec: {} })).toBeDefined();
		// A kind with no name, an account's, is made with none.
		expect(COMMANDS.create.body({ kind: 'account', spec: {} })).toEqual({
			kind: 'account',
			spec: {},
		});
	});

	it.each([
		['a kind the catalog does not name', { kind: 'planet', ref: 'a', revision: 1, patch: {} }],
		['a revision not a whole number', { kind: 'node', ref: 'a', revision: 1.5, patch: {} }],
		['an empty ref', { kind: 'node', ref: '', revision: 1, patch: {} }],
		['a spec not an object', { kind: 'node', ref: 'a', revision: 1, patch: [] }],
		// `by` is the request's Access identity, never what the browser says it is.
		['a `by` of its own', { kind: 'node', ref: 'a', revision: 1, patch: {}, by: 'someone' }],
		['nothing', undefined],
	])('is refused for %s', (_, body) => {
		expect(COMMANDS.patch.body(body)).toBeUndefined();
	});
});

describe("a command's request", () => {
	const ORIGIN = URLS.internal.console;
	const sent = (headers: Record<string, string>) =>
		new Request(`${ORIGIN}/api/patch`, { method: 'POST', headers, body: '{}' });

	it("is taken from the console's own page", () => {
		const json = { 'content-type': 'application/json' };
		expect(crossSite(sent(json))).toBeUndefined();
		expect(crossSite(sent({ 'content-type': 'Application/JSON; charset=utf-8' }))).toBeUndefined();
		expect(
			crossSite(sent({ ...json, origin: ORIGIN, 'sec-fetch-site': 'same-origin' })),
		).toBeUndefined();
	});

	it.each([
		['a form', { 'content-type': 'application/x-www-form-urlencoded' }],
		['plain text, which a form can send', { 'content-type': 'text/plain' }],
		['no content type', {}],
		['another origin', { 'content-type': 'application/json', origin: URLS.internal.app }],
		['another site', { 'content-type': 'application/json', 'sec-fetch-site': 'cross-site' }],
		['a sibling host', { 'content-type': 'application/json', 'sec-fetch-site': 'same-site' }],
	])('is refused from %s, before anything else is read', async (_, headers) => {
		const refused = crossSite(sent(headers));
		expect(refused?.status).toBe(403);
		expect(await refused?.json()).toMatchObject({ status: 'error', code: 'invalid_token' });
	});
});
