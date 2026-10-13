/**
 * The browser's writes: each sent once to the console's own `/api/`, where the server adds the
 * registry's token and `by` from the request's Access identity, so neither is the browser's to
 * hold. A spec is sent and never kept: a secret's value in it lives as long as the call, and the
 * form it came from clears its field after. See ../server/commands.ts and platform's RFC cpc2b.
 */
import { pathOf } from '@canmi/addresses';
import { ASKED, PREFIX } from '../facets.ts';
import type { BodyOf, CommandName } from '../server/commands.ts';
import type { Kind } from './catalog.gen.ts';
import type { Failure, Spec, Written } from './types.ts';

const refused = (status: number, code: string, message: string): Written => ({
	ok: false,
	failure: { status, code, message },
});

/** `name` sent with `body`, and what it came back with, a refusal included. */
async function sent<N extends CommandName>(name: N, body: BodyOf<N>): Promise<Written> {
	try {
		const answer = await fetch(pathOf(ASKED, PREFIX, name), {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify(body),
		});
		const read = (await answer.json().catch(() => undefined)) as
			| { status: 'success'; data: Written }
			| ({ status: 'error' } & Omit<Failure, 'status'>)
			| undefined;
		if (read?.status === 'success') return read.data;
		if (read?.status === 'error') return refused(answer.status, read.code, read.message);
		return refused(
			answer.status,
			'upstream_unavailable',
			'The console answered outside the envelope.',
		);
	} catch {
		return refused(0, 'upstream_unavailable', 'The console did not answer.');
	}
}

/**
 * A resource of `kind` made at revision 0, by its name where the kind has one and with none where
 * it does not; its task and, for one with no name, the id the registry drew -- or why not.
 */
export function create(kind: Kind, name: string | undefined, spec: Spec): Promise<Written> {
	return sent('create', name === undefined ? { kind, spec } : { kind, name, spec });
}

/**
 * The resource `ref` names, by id or name, changed by `change` -- RFC 7386's, a `null` taking a key
 * out, ./patch.ts making one from two specs -- held to the `revision` it was read at. An empty
 * patch changes nothing and is not sent.
 */
export async function patch(
	kind: Kind,
	ref: string,
	revision: number,
	change: Spec,
): Promise<Written> {
	if (Object.keys(change).length === 0) return { ok: true, unchanged: true };
	return sent('patch', { kind, ref, revision, patch: change });
}
