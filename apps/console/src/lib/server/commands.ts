/**
 * What the browser asks the console to write, each answered once by a `POST` at an address worked
 * out from its type as a facet's is: its body checked here, `by` the request's Access identity and
 * the registry's token added by ./control.ts, so neither is ever the browser's to send. See
 * spec/architecture/console.md, "A component asks for its facet", and platform's RFC cpc2b.
 */
import { failure } from '@canmi/response';
import * as v from 'valibot';
import { Kind } from '../control/catalog.gen.ts';
import type { Create, Patch, Spec, Written } from '../control/types.ts';
import { create, patch } from './control.ts';
import { type Watched, watch } from './edge.ts';
import { NODES, type Node } from './nodes.ts';
import type { Edge } from './read.ts';

export interface Command<B, R> {
	/** Raised where what it does means something new and its type says nothing of it. */
	revision: number;
	/** Its body from what the browser sent; undefined where that is not one it takes. */
	body: (sent: unknown) => B | undefined;
	run: (edge: Edge, by: string, body: B) => Promise<R>;
}

const command = <B, R>(one: Command<B, R>): Command<B, R> => one;

/** An object of keys, never a list, which a spec and a patch both are. */
const SPEC = v.custom<Spec>(
	(spec) => typeof spec === 'object' && spec !== null && !Array.isArray(spec),
);
const NAMED = v.pipe(v.string(), v.minLength(1));

const CREATE: v.GenericSchema<Create> = v.strictObject({
	kind: Kind,
	name: v.exactOptional(NAMED),
	spec: SPEC,
});

const PATCH: v.GenericSchema<Patch> = v.strictObject({
	kind: Kind,
	ref: NAMED,
	revision: v.pipe(v.number(), v.integer(), v.minValue(0)),
	patch: SPEC,
});

const NODE = v.picklist(Object.keys(NODES) as Node[]);

const WATCH = v.strictObject({ node: NODE, via: v.exactOptional(NODE) });

/** `schema`'s reading of `sent`, or undefined. */
const read =
	<T>(schema: v.GenericSchema<T>) =>
	(sent: unknown): T | undefined => {
		const parsed = v.safeParse(schema, sent);
		return parsed.success ? parsed.output : undefined;
	};

export const COMMANDS = {
	/** A resource made by its name, or with none where its kind has none. */
	create: command({
		revision: 1,
		body: read(CREATE),
		run: (edge, by, body: Create): Promise<Written> => create(edge, by, body),
	}),

	/** A resource changed by a merge patch, at the revision it was read. */
	patch: command({
		revision: 1,
		body: read(PATCH),
		run: (edge, by, body: Patch): Promise<Written> => patch(edge, by, body),
	}),

	/**
	 * A page's lease on a node's fine readings, asked of the relay its live stream is on, `via`; it
	 * writes nothing anywhere, and is a `POST` because it asks something to start. Platform's RFC
	 * grmtb.
	 */
	watch: command({
		revision: 1,
		body: read(WATCH),
		run: (edge, _by, body: Watched) => watch(edge, body),
	}),
};

/**
 * A refusal where `request` may have come from another site's page, or undefined where it is the
 * console's own: JSON alone, which a plain form cannot send without asking first, and an `Origin`
 * and `Sec-Fetch-Site`, where the browser sends them, naming this origin. So a page elsewhere
 * cannot write through a reader's Access session. The catalog has no `forbidden`; a session used
 * from elsewhere is the closest to a wrong token.
 */
export function crossSite(request: Request): Response | undefined {
	const type = request.headers.get('content-type')?.split(';')[0]?.trim().toLowerCase();
	const origin = request.headers.get('origin');
	const site = request.headers.get('sec-fetch-site');
	const own =
		type === 'application/json' &&
		(origin === null || origin === new URL(request.url).origin) &&
		(site === null || site === 'same-origin');
	if (own) return undefined;
	return failure(403, 'invalid_token', { message: 'A write is made from the console alone.' });
}

export type Commands = typeof COMMANDS;
export type CommandName = keyof Commands;
export type BodyOf<N extends CommandName> = NonNullable<ReturnType<Commands[N]['body']>>;
