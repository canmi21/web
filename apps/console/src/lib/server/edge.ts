/**
 * The relays reached through each node's binding, and the console's live socket handed to the
 * nearest one that opens. Once the socket is passed on nothing here runs per message. See
 * spec/architecture/console.md, "Live, through the nearest node". No authentication of its own:
 * Access stands in front of every `.app` name, see the same file. Answered through ./api.ts.
 */
import { failure } from '@canmi/response';
import { URLS } from '@monoflake/sdk';
import { type Node, type Whereabouts, order } from './nodes.ts';

/**
 * Each node's Caddy, through that node's tunnel, bound by its name in capitals, and the read-only
 * token every node's host takes for its `GET` routes; see wrangler.jsonc. The registry's write
 * token is the Worker's secret alone, and the Access team and audience its writes are signed for;
 * see ./control.ts and ./access.ts.
 */
export type Env = Readonly<
	Partial<Record<Uppercase<Node>, Fetcher>> & {
		HOST_READ_TOKEN?: string;
		REGISTRY_TOKEN?: string;
		ACCESS_TEAM?: string;
		ACCESS_AUD?: string;
	}
>;

/** The relay's interface on a node; VPC sends it as the `Host` Caddy routes on. See platform's
 * spec/architecture/services.md, "One door per node". */
const INTERFACE = `relay.${new URL(URLS.internal.app).hostname}`;
export const RELAY = `http://${INTERFACE}`;

/** How many nodes one request tries before it gives up. */
export const TRIES = 3;

/** How long one node may take to answer before it counts as unavailable, in milliseconds. */
export const TIMEOUT = 4000;

/**
 * How a node is reached: over its VPC binding, to its Caddy, which carries the WebSocket too. See
 * spec/architecture/console.md, "Live, through the nearest node".
 */
export function reach(env: Env, node: Node, path: string, init: RequestInit): Promise<Response> {
	const binding = bindingOf(env, node);
	if (binding === undefined) return Promise.reject(new Error(`${node} is not bound`));
	return binding.fetch(`${RELAY}${path}`, init);
}

/** A node's binding, absent where wrangler.jsonc binds none. */
export function bindingOf(env: Env, node: Node): Fetcher | undefined {
	return env[node.toUpperCase() as Uppercase<Node>];
}

/** The first answer among `nodes` that `taken` accepts, trying `TRIES` of them at most. */
export async function first(
	nodes: readonly Node[],
	ask: (node: Node) => Promise<Response>,
	taken: (answer: Response) => boolean,
): Promise<{ node: Node; answer: Response } | undefined> {
	for (const node of nodes.slice(0, TRIES)) {
		try {
			const answer = await ask(node);
			if (taken(answer)) return { node, answer };
			await answer.body?.cancel();
			console.error(`live: ${node} answered ${answer.status}`);
		} catch (error) {
			console.error(`live: ${node} did not answer: ${String(error)}`);
		}
	}
	return undefined;
}

/** The socket of the first node that opens one, with the browser's `Origin` and socket headers. */
export async function socketOf(
	request: Request,
	env: Env,
	nodes: readonly Node[],
): Promise<WebSocket | undefined> {
	const headers = new Headers(request.headers);
	// The URL names the relay; this `Host` is the Worker's own.
	headers.delete('host');
	const opened = await first(
		nodes,
		// The browser's query, `deltas` among it, is the relay's to read.
		(node) => reach(env, node, `/live${new URL(request.url).search}`, { headers }),
		(answer) => answer.status === 101 && answer.webSocket !== null,
	);
	return opened?.answer.webSocket ?? undefined;
}

/** Whether a request that is no upgrade asks for an event stream. */
const streams = (request: Request) =>
	request.headers.get('accept')?.includes('text/event-stream') ?? false;

/**
 * The first relay's event stream, nearest first, handed on as it arrives: its body passed through
 * untouched, encoded as Caddy encoded it, so nothing here runs per event. A relay before the
 * stream answers 426 and is passed over. Platform's spec/architecture/relay.md, RFC grmtb.
 */
export async function streamOf(request: Request, env: Env, nodes: readonly Node[]) {
	const headers = new Headers(request.headers);
	headers.delete('host');
	const opened = await first(
		nodes,
		(node) => reach(env, node, `/live${new URL(request.url).search}`, { headers }),
		(answer) =>
			answer.ok && (answer.headers.get('content-type') ?? '').startsWith('text/event-stream'),
	);
	if (opened === undefined) return failure(502, 'upstream_unavailable');
	return new Response(opened.answer.body, opened.answer);
}

/**
 * The browser's socket joined to the first relay that opens one, nearest first, or the first
 * relay's event stream where the browser asks for one: the `live` stream the API answers.
 * `TIMEOUT` never bounds either, since an established stream outlives any request.
 */
export async function openLive(request: Request, env: Env): Promise<Response> {
	if (request.headers.get('upgrade')?.toLowerCase() !== 'websocket') {
		if (streams(request))
			return streamOf(request, env, order(request.cf as Whereabouts | undefined));
		return failure(426, 'invalid_method');
	}
	const socket = await socketOf(request, env, order(request.cf as Whereabouts | undefined));
	if (socket === undefined) return failure(502, 'upstream_unavailable');
	return new Response(null, { status: 101, webSocket: socket });
}

/** A lease asked for: the node whose fine readings, and the relay a page's stream is on. */
export interface Watched {
	node: Node;
	via?: Node;
}

/**
 * A lease on `node`'s fine readings, asked of `via`'s relay, where the page's stream is, else of
 * the nearest: whether one took it. A relay before the lease answers no such route, and the page
 * draws the minutes instead. Platform's spec/architecture/relay.md, RFC grmtb.
 */
export async function watch(
	edge: { env: Env; where?: Whereabouts; mock?: boolean },
	{ node, via }: Watched,
): Promise<{ watched: boolean }> {
	if (edge.mock) return { watched: true };
	const nodes = via ? [via] : order(edge.where);
	const ask = (one: Node) =>
		reach(edge.env, one, `/watch?node=${node}`, {
			method: 'POST',
			signal: AbortSignal.timeout(TIMEOUT),
		});
	const taken = await first(nodes, ask, (answer) => answer.ok);
	await taken?.answer.body?.cancel();
	return { watched: taken !== undefined };
}
