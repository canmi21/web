import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Env } from './edge.ts';
import {
	API,
	CORES,
	LEDGER,
	catalog,
	create,
	patch,
	resource,
	resources,
	task,
	tasks,
} from './control.ts';
import { controlMock } from './mock-control.ts';
import type { Edge } from './read.ts';

const TOKEN = 'registry-token';

const envelope = (data: unknown, status = 200) =>
	Response.json({ status: 'success', data }, { status });
const refusal = (status: number, code: string) =>
	Response.json({ status: 'error', code, message: code }, { status });
const KINDS = ((await (await controlMock('/registry/v1/kinds')).json()) as { data: unknown }).data;

interface Sent {
	node: string;
	url: string;
	method: string;
	headers: Headers;
	body?: string;
}

/** Bindings that record what each node was sent and answer as `answer` says. */
function bound(answer: (node: string, url: URL) => Response | Promise<Response>, token = TOKEN) {
	const sent: Sent[] = [];
	const binding = (node: string) =>
		({
			fetch: async (url: string, init: RequestInit = {}) => {
				const headers = new Headers(init.headers);
				sent.push({ node, url, method: init.method ?? 'GET', headers, body: init.body as string });
				return answer(node, new URL(url));
			},
		}) as unknown as Fetcher;
	const env = Object.fromEntries(
		['tyo', 'sin', 'rdu', 'gvx'].map((node) => [node.toUpperCase(), binding(node)]),
	);
	const edge: Edge = { env: { ...env, REGISTRY_TOKEN: token || undefined } as Env };
	return { sent, edge };
}

/** A registry on every core answering its catalog, and `rest` for anything else. */
const registry = (rest: (node: string, url: URL) => Response) => (node: string, url: URL) =>
	url.pathname === '/registry/v1/kinds' ? envelope(KINDS) : rest(node, url);

afterEach(() => vi.restoreAllMocks());

describe('the registry, as the console reaches it', () => {
	it('is the nearest core, at its private scope of the API host', async () => {
		const { sent, edge } = bound(registry(() => refusal(404, 'no_such_route')));
		const read = await catalog(edge);
		expect(read.ok && read.data.items.map((one) => one.plural)).toContain('nodes');
		expect(sent[0]).toMatchObject({ node: 'tyo', url: `${API}/registry/v1/kinds`, method: 'GET' });
		expect(sent[0]?.headers.has('authorization')).toBe(false);
	});

	it('passes to the next core where one is down or its Caddy answers outside the envelope', async () => {
		vi.spyOn(console, 'error').mockImplementation(() => {});
		const { sent, edge } = bound((node) => {
			if (node === 'tyo') throw new Error('unreachable');
			if (node === 'sin') return new Response('Bad Gateway', { status: 502 });
			return envelope(KINDS);
		});
		const read = await catalog(edge);
		expect(read.ok && read.node).toBe('rdu');
		expect(sent.map((one) => one.node)).toEqual(['tyo', 'sin', 'rdu']);
	});

	it("takes a refusal in the envelope as the registry's answer, asking no other core", async () => {
		const { sent, edge } = bound(registry(() => refusal(404, 'no_such_node')));
		const read = await resource(edge, 'node', 'nowhere');
		expect(!read.ok && read.failure.code).toBe('no_such_node');
		expect(sent.filter((one) => one.url.endsWith('/nowhere')).length).toBe(1);
	});

	it('refuses a catalog its generated schema does not read, naming where', async () => {
		vi.spyOn(console, 'error').mockImplementation(() => {});
		const broken = {
			items: [{ name: 'node', plural: 'nodes', fields: [{ name: 'a' }], actions: [], columns: [] }],
		};
		const { edge } = bound(() => envelope(broken));
		const read = await catalog(edge);
		expect(!read.ok && read.failure).toMatchObject({ status: 502, code: 'upstream_unavailable' });
		expect(!read.ok && read.failure.message).toContain('items.0.fields.0');
	});

	it('reads a kind at the route the catalog names, and refuses one it does not hold', async () => {
		const { sent, edge } = bound(registry(() => envelope({ items: [], revision: 7 })));
		const read = await resources(edge, 'account');
		expect(read.ok && read.data.revision).toBe(7);
		expect(sent.at(-1)?.url).toBe(`${API}/registry/v1/accounts`);
		const none = await resources(edge, 'planet');
		expect(!none.ok && none.failure.status).toBe(404);
	});
});

describe('a write, as the console sends it', () => {
	const change = { kind: 'node' as const, ref: 'tyo', revision: 12, patch: { retired: true } };

	it("carries the Worker's token and the identity it was given, held to the revision read", async () => {
		const { sent, edge } = bound(
			registry(() => envelope({ revision: 13, task: 'abcdef0123456789' }, 202)),
		);
		expect(await patch(edge, 'author@example.com', change)).toEqual({
			ok: true,
			task: 'abcdef0123456789',
			revision: 13,
		});
		const write = sent.at(-1);
		expect(write).toMatchObject({ method: 'PATCH', url: `${API}/registry/v1/nodes/tyo` });
		expect(write?.headers.get('authorization')).toBe(`Bearer ${TOKEN}`);
		expect(write?.headers.get('content-type')).toBe('application/json');
		expect(JSON.parse(write?.body ?? '')).toEqual({
			by: 'author@example.com',
			revision: 12,
			spec: { retired: true },
		});
	});

	it('creates by name at revision 0', async () => {
		const { sent, edge } = bound(
			registry(() => envelope({ revision: 1, task: '0123456789abcdef' }, 202)),
		);
		await create(edge, 'author@example.com', { kind: 'domain', name: 'oci-3', spec: {} });
		expect(sent.at(-1)).toMatchObject({ method: 'PUT', url: `${API}/registry/v1/domains/oci-3` });
		expect(JSON.parse(sent.at(-1)?.body ?? '')).toMatchObject({ revision: 0 });
	});

	it('says unchanged where nothing changed, and passes a refusal on with its code', async () => {
		const same = bound(registry(() => envelope({})));
		expect(await patch(same.edge, 'a', change)).toEqual({ ok: true, unchanged: true });
		const stale = bound(registry(() => refusal(409, 'invalid_revision')));
		const refused = await patch(stale.edge, 'a', change);
		expect(!refused.ok && refused.failure).toMatchObject({ status: 409, code: 'invalid_revision' });
		expect(stale.sent.filter((one) => one.method === 'PATCH').length).toBe(1);
	});

	it('is not sent at all by a Worker that holds no token', async () => {
		const { sent, edge } = bound(
			registry(() => envelope({})),
			'',
		);
		const refused = await patch(edge, 'a', change);
		expect(!refused.ok && refused.failure.code).toBe('service_unavailable');
		expect(sent.length).toBe(0);
	});

	it('is never sent again to another core after one took too long, since it may have been taken', async () => {
		const errors = vi.spyOn(console, 'error').mockImplementation(() => {});
		const { sent, edge } = bound(
			registry(() => {
				throw new DOMException('The operation timed out.', 'TimeoutError');
			}),
		);
		const secret = {
			kind: 'account' as const,
			ref: 'oci-2',
			revision: 3,
			patch: { identities: [{ kind: 'email', value: 'hush-123' }] },
		};
		const refused = await patch(edge, 'a', secret);
		expect(!refused.ok && refused.failure.status).toBe(504);
		expect(sent.filter((one) => one.method === 'PATCH').map((one) => one.node)).toEqual(['tyo']);
		// The spec may carry a secret's value, which no log line may hold.
		expect(JSON.stringify(errors.mock.calls)).not.toContain('hush-123');
	});
});

describe('the ledger, as the console reaches it', () => {
	const listed = (count: number) =>
		Array.from({ length: count }, (_, index) => ({
			id: `t${index}`,
			cursor: `${100 - index}:t${index}`,
		}));

	it("is its one node's scope, narrowed by the query, with the next page's cursor when full", async () => {
		const { sent, edge } = bound(() => envelope(listed(2)));
		const page = await tasks(edge, { service: 'registry', limit: '2', kind: '' });
		expect(sent.map((one) => one.node)).toEqual([LEDGER]);
		expect(sent[0]?.url).toBe(`${API}/ledger/tasks?service=registry&limit=2`);
		expect(page.ok && page.data.next).toBe('99:t1');
		const last = await tasks(bound(() => envelope(listed(1))).edge, { limit: '2' });
		expect(last.ok && 'next' in last.data).toBe(false);
	});

	it('reads one task by its service and id', async () => {
		const { sent, edge } = bound(() => envelope({ id: 'x', events: [], children: [] }));
		await task(edge, 'registry', 'abc/def');
		expect(sent[0]?.url).toBe(`${API}/ledger/tasks/registry/abc%2Fdef`);
	});
});

describe('mock mode', () => {
	const untouched = new Proxy({} as Env, { get: () => ({ fetch: () => expect.unreachable() }) });
	const edge: Edge = { env: untouched, mock: true };

	it('writes to made-up data and reads it back, its task done in the made-up ledger', async () => {
		const read = await resource(edge, 'node', 'gvx');
		if (!read.ok) throw new Error(read.failure.message);
		const written = await patch(edge, 'developer', {
			kind: 'node',
			ref: read.data.id,
			revision: read.data.revision,
			patch: { retired: true },
		});
		if (!written.ok || !('task' in written)) throw new Error('not written');
		const after = await resource(edge, 'node', 'gvx');
		expect(after.ok && after.data.spec.retired).toBe(true);
		expect(after.ok && after.data.revision).toBe(written.revision);
		const done = await task(edge, 'registry', written.task);
		expect(done.ok && done.data.state).toBe('done');
		expect(done.ok && done.data.events.map((one) => one.stage)).toEqual(['written']);
		const again = await patch(edge, 'developer', {
			kind: 'node',
			ref: 'gvx',
			revision: read.data.revision,
			patch: {},
		});
		expect(!again.ok && again.failure.code).toBe('invalid_revision');
	});

	it("keeps an identity's masked value as written and answers it, as the registry does", async () => {
		const read = await resource(edge, 'account', 'oci-2');
		if (!read.ok) throw new Error(read.failure.message);
		const identities = [{ kind: 'email', value: 'author@example.com' }];
		await patch(edge, 'developer', {
			kind: 'account',
			ref: 'oci-2',
			revision: read.data.revision,
			patch: { identities },
		});
		const after = await resource(edge, 'account', 'oci-2');
		expect(after.ok && after.data.spec.identities).toEqual(identities);
	});
});

/** Each service's placements as its `service.toml` in the platform's checkout declares them. */
function placements(service: string): string[] | undefined {
	const path = fileURLToPath(
		new URL(`../../../../../../platform/apps/data/${service}/service.toml`, import.meta.url),
	);
	if (!existsSync(path)) return undefined;
	const line = readFileSync(path, 'utf8').match(/^placements = (\[.*\])$/m)?.[1];
	return line === undefined ? undefined : (JSON.parse(line) as string[]);
}

describe('where the console looks for the registry and the ledger', () => {
	it.skipIf(placements('registry') === undefined)('is where the platform places them', () => {
		expect([...CORES].toSorted()).toEqual(placements('registry')?.toSorted());
		expect([LEDGER]).toEqual(placements('ledger'));
	});
});
