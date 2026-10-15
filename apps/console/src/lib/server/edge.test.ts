import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { URLS } from '@monoflake/sdk';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { type Env, RELAY, TRIES, openLive, socketOf, streamOf } from './edge.ts';
import { NODES, type Node, learnNodes, order } from './nodes.ts';
import { ID, PLACED } from './nodes.fixture.ts';

/** wrangler.jsonc as data: its comments and trailing commas taken off, strings left alone. */
function wrangler(): {
	routes: Array<{ pattern: string; custom_domain?: boolean }>;
	vpc_services: Array<{ binding: string }>;
} {
	const text = readFileSync(join(import.meta.dirname, '../../../wrangler.jsonc'), 'utf8');
	const bare = text.replace(
		/("(?:\\.|[^"\\])*")|\/\/[^\n]*/g,
		(_match: string, string?: string) => string ?? '',
	);
	return JSON.parse(bare.replace(/,(\s*[}\]])/g, '$1'));
}

/**
 * A socket as a binding hands it back. Node's `Response` refuses a 101, so an opened socket is an
 * object shaped like one, and the 101 the Worker builds from it is left to the runtime.
 */
const OPENED = { status: 101, ok: false, body: null, webSocket: {} } as unknown as Response;

/** VPC bindings that record what they were sent; each answers as `answers` says, or throws. */
function bound(answers: Partial<Record<Node, () => Response>>) {
	const sent: { node: Node; url: string; headers: Headers }[] = [];
	const env = Object.fromEntries(
		Object.entries(answers).map(([node, answer]) => [
			NODES[node as Node],
			{
				fetch: async (url: string, init: RequestInit) => {
					sent.push({ node: node as Node, url, headers: new Headers(init.headers) });
					return answer();
				},
			} as unknown as Fetcher,
		]),
	) as Env;
	return { sent, env };
}

function down(): Response {
	throw new Error('tunnel down');
}

/** Where Cloudflare places every reader here: Osaka, whose order is Tokyo's three first. */
const OSAKA = { latitude: '34.6937', longitude: '135.5023' };
learnNodes(PLACED);
const NEAREST = order(OSAKA);

function asked(path: string, init: RequestInit = {}): Request {
	const request = new Request(new URL(path, 'https://console.example.test'), init);
	return Object.assign(request, { cf: OSAKA });
}

const UPGRADE = { headers: { upgrade: 'websocket', origin: URLS.internal.app } };

afterEach(() => {
	vi.restoreAllMocks();
});

describe('wrangler.jsonc', () => {
	it("answers on control's apex and binds every node it places, by its id", () => {
		const config = wrangler();
		// TODO: held to `URLS.internal.console` again once the console bumps to the sdk publishing it.
		expect(config.routes).toEqual([{ pattern: 'monoflake.net', custom_domain: true }]);
		const bindings = config.vpc_services.map((service) => service.binding).toSorted();
		expect(bindings).toEqual(Object.values(NODES).toSorted());
	});
});

describe('the API ahead of the pages', () => {
	it('shares its prefix with no page', () => {
		// A page here would never be reached: src/hooks.server.ts hands `/api/` to the API first.
		const pages = readdirSync(join(import.meta.dirname, '../../routes'));
		expect(pages).not.toContain('api');
	});
});

describe('the live socket', () => {
	it('goes on to the next node when the nearest throws', async () => {
		vi.spyOn(console, 'error').mockImplementation(() => {});
		const { sent, env } = bound({ [ID.tyo]: down, [ID.hnd]: () => OPENED, [ID.nrt]: () => OPENED });
		const nodes: Node[] = [ID.tyo, ID.hnd, ID.nrt];
		const socket = await socketOf(asked('/live', UPGRADE), env, nodes);
		expect(socket).toBe(OPENED.webSocket);
		expect(sent.map(({ node }) => node)).toEqual([ID.tyo, ID.hnd]);
		expect(sent.every(({ url }) => url === `${RELAY}/live`)).toBe(true);
		// The browser's page goes with it, since the relay admits by `Origin`.
		expect(sent[1]?.headers.get('origin')).toBe(URLS.internal.app);
		expect(sent[1]?.headers.get('upgrade')).toBe('websocket');
	});

	it('opens the socket with no deadline, which would cut it once open', async () => {
		const signals: (AbortSignal | null | undefined)[] = [];
		const env = {
			[NODES[ID.tyo]]: {
				fetch: async (_url: string, init: RequestInit = {}) => {
					signals.push(init.signal);
					return OPENED;
				},
			} as unknown as Fetcher,
		} as Env;
		await socketOf(asked('/live', UPGRADE), env, [ID.tyo]);
		expect(signals).toEqual([undefined]);
	});

	it('takes no answer but an opened socket', async () => {
		vi.spyOn(console, 'error').mockImplementation(() => {});
		const refused = () => new Response(null, { status: 403 });
		const { sent, env } = bound({ [ID.tyo]: refused, [ID.nrt]: () => OPENED });
		const socket = await socketOf(asked('/live', UPGRADE), env, [ID.tyo, ID.nrt]);
		expect(socket).toBe(OPENED.webSocket);
		expect(sent).toHaveLength(2);
	});

	it(`gives up after ${TRIES} nodes with an envelope's 502`, async () => {
		vi.spyOn(console, 'error').mockImplementation(() => {});
		const every = Object.fromEntries(Object.keys(NODES).map((node) => [node, down]));
		const { sent, env } = bound(every);
		const response = await openLive(asked('/live', UPGRADE), env);
		expect(response.status).toBe(502);
		expect(await response.json()).toMatchObject({ code: 'upstream_unavailable' });
		expect(sent.map(({ node }) => node)).toEqual(NEAREST.slice(0, TRIES));
	});

	it('refuses a request that asks for no socket', async () => {
		const { sent, env } = bound({ [ID.tyo]: () => OPENED });
		const response = await openLive(asked('/live'), env);
		expect(response.status).toBe(426);
		expect(sent).toHaveLength(0);
	});
});

describe('the live event stream', () => {
	const STREAM = { headers: { accept: 'text/event-stream', origin: URLS.internal.app } };

	/** A relay's stream that sends `first` and then holds on, as a live one does. */
	function holding(first: string): Response {
		const encoder = new TextEncoder();
		const body = new ReadableStream<Uint8Array>({
			start(controller) {
				controller.enqueue(encoder.encode(first));
			},
		});
		return new Response(body, { headers: { 'content-type': 'text/event-stream' } });
	}

	it('hands the stream on as it arrives, the first event before the stream ends', async () => {
		const { sent, env } = bound({ [ID.tyo]: () => holding('data: {"type":"cluster"}\n\n') });
		const answer = await streamOf(asked('/live?deltas=true', STREAM), env, [ID.tyo]);
		expect(answer.headers.get('content-type')).toBe('text/event-stream');
		const reader = answer.body!.getReader();
		const read = await Promise.race([
			reader.read(),
			new Promise((settle) => setTimeout(() => settle('held'), 1000)),
		]);
		expect(new TextDecoder().decode((read as { value: Uint8Array }).value)).toBe(
			'data: {"type":"cluster"}\n\n',
		);
		expect(sent[0]?.url).toBe(`${RELAY}/live?deltas=true`);
		expect(sent[0]?.headers.get('accept')).toBe('text/event-stream');
		await reader.cancel();
	});

	it('passes over a relay that answers no stream, and says so where none does', async () => {
		vi.spyOn(console, 'error').mockImplementation(() => {});
		const refused = () => new Response(null, { status: 426 });
		const { sent, env } = bound({ [ID.tyo]: refused, [ID.hnd]: () => holding(': ping\n\n') });
		const answer = await openLive(asked('/live', STREAM), env);
		expect(answer.status).toBe(200);
		await answer.body?.cancel();
		expect(sent.map(({ node }) => node)).toEqual([ID.tyo, ID.hnd]);
		const none = bound({ [ID.tyo]: refused, [ID.hnd]: refused, [ID.nrt]: refused });
		expect((await openLive(asked('/live', STREAM), none.env)).status).toBe(502);
	});
});
