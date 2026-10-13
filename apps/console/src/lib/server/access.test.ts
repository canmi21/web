import { URLS } from '@monoflake/sdk';
import { describe, expect, it, vi } from 'vitest';
import { type Access, type FetchKeys, accessOf, identityOf } from './access.ts';

const ACCESS: Access = { team: 'team.cloudflareaccess.com', aud: 'console-aud' };
const NOW = 1_800_000_000;
const ISSUER = `https://${ACCESS.team}`;

const base64url = (bytes: Uint8Array | string) =>
	btoa(typeof bytes === 'string' ? bytes : String.fromCharCode(...bytes))
		.replaceAll('+', '-')
		.replaceAll('/', '_')
		.replace(/=+$/, '');

const algorithm = { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' };

async function keyPair() {
	const pair = (await crypto.subtle.generateKey(
		{ ...algorithm, modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]) },
		true,
		['sign', 'verify'],
	)) as CryptoKeyPair;
	return { pair, jwk: await crypto.subtle.exportKey('jwk', pair.publicKey) };
}

const signer = await keyPair();
const stranger = await keyPair();

/** A token as Access would sign it, every claim overridable. */
async function signed(claims: Record<string, unknown> = {}, kid = 'one', key = signer.pair) {
	const head = base64url(JSON.stringify({ alg: 'RS256', kid, typ: 'JWT' }));
	const body = base64url(
		JSON.stringify({
			aud: [ACCESS.aud],
			iss: ISSUER,
			email: 'author@example.com',
			exp: NOW + 600,
			iat: NOW,
			nbf: NOW,
			...claims,
		}),
	);
	const signature = await crypto.subtle.sign(
		algorithm,
		key.privateKey,
		new TextEncoder().encode(`${head}.${body}`),
	);
	return `${head}.${body}.${base64url(new Uint8Array(signature))}`;
}

const sent = (token?: string) =>
	new Request(`${URLS.internal.console}/api/patch`, {
		method: 'POST',
		headers: token ? { 'cf-access-jwt-assertion': token } : {},
	});

/** The team's keys, `kids` naming the signer's key; counts how often they were asked. */
function keys(...kids: string[]) {
	const fetched = vi.fn<FetchKeys>(async () => ({
		keys: kids.map((kid) => ({ ...signer.jwk, kid })),
	}));
	return fetched;
}

describe("a request's Access identity", () => {
	it('is the email of a token Access signed for the console, verified by its key', async () => {
		// A team of its own, so no key another test held is reused.
		const access = { ...ACCESS, team: 'first.cloudflareaccess.com' };
		const token = await signed({ iss: `https://${access.team}` });
		const fetched = keys('one');
		expect(await identityOf(sent(token), access, fetched, NOW)).toBe('author@example.com');
		expect(fetched).toHaveBeenCalledWith(`https://${access.team}/cdn-cgi/access/certs`);
	});

	it.each([
		['another application', { aud: ['other-aud'] }],
		['another team', { iss: ISSUER.replace('team', 'other') }],
		['an expired token', { exp: NOW - 120 }],
		['a token not valid yet', { nbf: NOW + 120 }],
		['a service token, which names no person', { email: undefined, common_name: 'svc' }],
	])('is nobody for %s', async (_, claims) => {
		expect(await identityOf(sent(await signed(claims)), ACCESS, keys('one'), NOW)).toBeUndefined();
	});

	it('is nobody where the signature is not the key the team lists', async () => {
		const token = await signed({}, 'one', stranger.pair);
		expect(await identityOf(sent(token), ACCESS, keys('one'), NOW)).toBeUndefined();
	});

	it('is nobody where the token was altered after it was signed', async () => {
		const [head, , signature] = (await signed()).split('.');
		const body = base64url(
			JSON.stringify({ aud: [ACCESS.aud], email: 'someone@else', exp: NOW + 60 }),
		);
		expect(
			await identityOf(sent(`${head}.${body}.${signature}`), ACCESS, keys('one'), NOW),
		).toBeUndefined();
	});

	it('is nobody with no token, an unreadable one, another algorithm, or no settings', async () => {
		const fetched = keys('one');
		expect(await identityOf(sent(), ACCESS, fetched, NOW)).toBeUndefined();
		expect(await identityOf(sent('not.a.token'), ACCESS, fetched, NOW)).toBeUndefined();
		const none = `${base64url('{"alg":"none"}')}.${(await signed()).split('.')[1]}.`;
		expect(await identityOf(sent(none), ACCESS, fetched, NOW)).toBeUndefined();
		expect(await identityOf(sent(await signed()), undefined, fetched, NOW)).toBeUndefined();
		expect(fetched).not.toHaveBeenCalled();
	});

	it('asks for the keys again when a token names one not held, as after a rotation', async () => {
		const access = { ...ACCESS, team: 'rotated.cloudflareaccess.com' };
		const iss = `https://${access.team}`;
		let calls = 0;
		const fetched: FetchKeys = async () => ({
			keys: [{ ...signer.jwk, kid: calls++ === 0 ? 'old' : 'new' }],
		});
		expect(await identityOf(sent(await signed({ iss }, 'old')), access, fetched, NOW)).toBe(
			'author@example.com',
		);
		const later = NOW + 120;
		const rotated = await signed({ iss, iat: later, nbf: later, exp: later + 600 }, 'new');
		expect(await identityOf(sent(rotated), access, fetched, later)).toBe('author@example.com');
		expect(calls).toBe(2);
	});

	it('asks again for a key not held once a minute at most, whatever kids the tokens name', async () => {
		const access = { ...ACCESS, team: 'hammered.cloudflareaccess.com' };
		const iss = `https://${access.team}`;
		const fetched = keys('one');
		await identityOf(sent(await signed({ iss })), access, fetched, NOW);
		for (const [index, at] of [NOW + 61, NOW + 62, NOW + 90, NOW + 122].entries()) {
			const token = await signed({ iss, nbf: at, exp: at + 600 }, `random-${index}`);
			expect(await identityOf(sent(token), access, fetched, at)).toBeUndefined();
		}
		// The first read, one more past the minute, and one more a minute after that.
		expect(fetched).toHaveBeenCalledTimes(3);
	});

	it("is read from the Worker's settings only when both are there", () => {
		expect(accessOf({ ACCESS_TEAM: 't', ACCESS_AUD: 'a' })).toEqual({ team: 't', aud: 'a' });
		expect(accessOf({ ACCESS_TEAM: 't' })).toBeUndefined();
	});
});
