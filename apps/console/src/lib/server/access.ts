/**
 * Who sent a request, as Cloudflare Access signed it: the `Cf-Access-Jwt-Assertion` it adds to
 * every request it lets through, verified against the team's keys and the console's application,
 * and never a header a request could carry by itself. A write's `by` is taken from it, never from
 * the browser's body -- platform's RFC cpc2b, "The identity that writes is taken from the request".
 * https://developers.cloudflare.com/cloudflare-one/identity/authorization-cookie/validating-json/
 */

/** The Access team and the console's application, both public, from wrangler.jsonc's `vars`. */
export interface Access {
	/** The team's domain, `<team>.cloudflareaccess.com`, which signs and lists its keys. */
	team: string;
	/** The application's audience tag. */
	aud: string;
}

/** A team's signing keys as its certs endpoint lists them. */
type Keys = { keys: (JsonWebKey & { kid?: string })[] };

/** How the keys are fetched; a test hands its own. */
export type FetchKeys = (url: string) => Promise<Keys>;

const fetchKeys: FetchKeys = async (url) => {
	const answer = await fetch(url, { signal: AbortSignal.timeout(4000) });
	if (!answer.ok) throw new Error(`${url} answered ${answer.status}`);
	return (await answer.json()) as Keys;
};

/** How long a team's keys are held before they are asked again; Access rotates them in weeks. */
const HELD_MS = 10 * 60_000;

/** A clock's drift either side that a token's times are forgiven. */
const LEEWAY_S = 60;

/**
 * How soon the keys are asked again for a key not held. A token names its own `kid` before it is
 * verified, so without this anyone could make every request ask Access for its keys.
 */
const AGAIN_MS = 60_000;

const held = new Map<string, { until: number; asked: number; keys: Keys }>();

/** The team's keys at `certs`, held; `again` asks before they expire, once a minute at most. */
async function keysOf(certs: string, fetched: FetchKeys, again: boolean, now: number) {
	const one = held.get(certs);
	const fresh = one !== undefined && one.until > now;
	if (one && fresh && (!again || one.asked + AGAIN_MS > now)) return one.keys;
	const keys = await fetched(certs);
	held.set(certs, { until: now + HELD_MS, asked: now, keys });
	return keys;
}

const decoder = new TextDecoder();

function bytesOf(part: string): Uint8Array<ArrayBuffer> {
	const base64 = part.replaceAll('-', '+').replaceAll('_', '/');
	const binary = atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, '='));
	return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

function jsonOf(part: string): Record<string, unknown> | undefined {
	try {
		const value: unknown = JSON.parse(decoder.decode(bytesOf(part)));
		return typeof value === 'object' && value !== null
			? (value as Record<string, unknown>)
			: undefined;
	} catch {
		return undefined;
	}
}

/** Whether the token's claims hold for `access` at `now`, in seconds. */
function admitted(claims: Record<string, unknown>, access: Access, now: number): boolean {
	const audiences = Array.isArray(claims.aud) ? claims.aud : [claims.aud];
	const { exp, nbf, iss } = claims;
	return (
		audiences.includes(access.aud) &&
		iss === `https://${access.team}` &&
		typeof exp === 'number' &&
		exp + LEEWAY_S > now &&
		(nbf === undefined || (typeof nbf === 'number' && nbf - LEEWAY_S <= now))
	);
}

/**
 * The email of the person `request` was sent by, or undefined where Access did not sign it, signed
 * it for another application, or signed a service token, which names no person.
 */
export async function identityOf(
	request: Request,
	access: Access | undefined,
	fetched: FetchKeys = fetchKeys,
	now = Date.now() / 1000,
): Promise<string | undefined> {
	const token = request.headers.get('cf-access-jwt-assertion');
	if (!access || !token) return undefined;
	const [head = '', body = '', signature = '', ...extra] = token.split('.');
	const header = jsonOf(head);
	const claims = jsonOf(body);
	if (extra.length > 0 || header?.alg !== 'RS256' || !claims || !admitted(claims, access, now)) {
		return undefined;
	}
	const certs = `https://${access.team}/cdn-cgi/access/certs`;
	try {
		// A key not held may be one rotated in since the keys were asked, so they are asked again.
		const at = now * 1000;
		const find = (keys: Keys) => keys.keys.find((one) => one.kid === header.kid);
		const key =
			find(await keysOf(certs, fetched, false, at)) ?? find(await keysOf(certs, fetched, true, at));
		if (!key) return undefined;
		const algorithm = { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' };
		const verifier = await crypto.subtle.importKey('jwk', key, algorithm, false, ['verify']);
		const signed = new TextEncoder().encode(`${head}.${body}`);
		if (!(await crypto.subtle.verify(algorithm, verifier, bytesOf(signature), signed))) {
			return undefined;
		}
	} catch (error) {
		console.error(`access: the token could not be verified: ${String(error)}`);
		return undefined;
	}
	return typeof claims.email === 'string' && claims.email !== '' ? claims.email : undefined;
}

/** The Access settings `env` holds, or undefined where either is missing. */
export function accessOf(env: { ACCESS_TEAM?: string; ACCESS_AUD?: string }): Access | undefined {
	return env.ACCESS_TEAM && env.ACCESS_AUD
		? { team: env.ACCESS_TEAM, aud: env.ACCESS_AUD }
		: undefined;
}
