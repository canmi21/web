import { afterEach, describe, expect, it, vi } from 'vitest';
import { URLS } from '@monoflake/sdk';
import type { Env } from './edge.ts';
import { memoryStore } from './cache.ts';
import {
	API,
	CORES,
	FACTS_FRESH_MS,
	UNREAD,
	catalog,
	create,
	forget,
	keptFacts,
	learned,
	patch,
	readFacts,
	resource,
	resources,
	task,
	tasks,
} from './control.ts';
import { controlMock } from './mock-control.ts';
import { displayOf } from '../scope/scope.ts';
import { NODES, type Node, learnedCores } from './nodes.ts';
import { ID } from './nodes.fixture.ts';
import type { Edge } from './read.ts';

const READ = 'control-read-token';
const WRITE = 'control-write-token';

const envelope = (data: unknown, status = 200) =>
	Response.json({ status: 'success', data }, { status });
const refusal = (status: number, code: string) =>
	Response.json({ status: 'error', code, message: code }, { status });
const KINDS = ((await (await controlMock('/v1/registry/kinds')).json()) as { data: unknown }).data;

interface Sent {
	/** `control`, reached over HTTPS, or the node whose binding was asked. */
	where: string;
	url: string;
	method: string;
	headers: Headers;
	body?: string;
}

/**
 * Control over HTTPS and the cores' bindings, each recording what it was sent and answering as
 * `answer` says; a token left empty is not set.
 */
function bound(
	answer: (where: string, url: URL) => Response | Promise<Response>,
	tokens = { read: READ, write: WRITE },
) {
	const sent: Sent[] = [];
	const asked =
		(where: string) =>
		async (url: string, init: RequestInit = {}): Promise<Response> => {
			const headers = new Headers(init.headers);
			const method = init.method ?? 'GET';
			sent.push({ where, url: String(url), method, headers, body: init.body as string });
			return answer(where, new URL(url));
		};
	vi.stubGlobal('fetch', asked('control'));
	const cores: Node[] = [ID.tyo, ID.sin, ID.rdu, ID.gvx];
	const env = Object.fromEntries(
		cores.map((node) => [NODES[node], { fetch: asked(node) } as unknown as Fetcher]),
	);
	const secrets = {
		CONTROL_READ_TOKEN: tokens.read || undefined,
		CONTROL_WRITE_TOKEN: tokens.write || undefined,
	};
	const edge: Edge = { env: { ...env, ...secrets } as Env };
	return { sent, edge };
}

/** Control answering its catalog, and `rest` for anything else. */
const control = (rest: (where: string, url: URL) => Response) => (where: string, url: URL) =>
	url.pathname === '/v1/registry/kinds' ? envelope(KINDS) : rest(where, url);

afterEach(() => {
	vi.restoreAllMocks();
	vi.unstubAllGlobals();
});

describe('control, as the console reaches it', () => {
	it('is asked over HTTPS with its read token, and no node', async () => {
		const { sent, edge } = bound(control(() => refusal(404, 'no_such_route')));
		const read = await catalog(edge);
		expect(read.ok && read.data.items.map((one) => one.plural)).toContain('nodes');
		expect(sent).toHaveLength(1);
		expect(sent[0]).toMatchObject({ where: 'control', url: `${URLS.control}/v1/registry/kinds` });
		expect(sent[0]?.headers.get('authorization')).toBe(`Bearer ${READ}`);
	});

	it('is asked once, its failure the answer, since it is one place', async () => {
		vi.spyOn(console, 'error').mockImplementation(() => {});
		const { sent, edge } = bound(() => {
			throw new Error('unreachable');
		});
		const read = await catalog(edge);
		expect(!read.ok && read.failure).toMatchObject({ status: 502, code: 'upstream_unavailable' });
		expect(sent.map((one) => one.where)).toEqual(['control']);
	});

	it("takes a refusal in the envelope as control's answer", async () => {
		vi.spyOn(console, 'error').mockImplementation(() => {});
		const { sent, edge } = bound(control(() => refusal(404, 'no_such_resource')));
		const read = await resource(edge, 'node', 'ffffffffffffffff');
		expect(!read.ok && read.failure.code).toBe('no_such_resource');
		expect(sent.filter((one) => one.url.endsWith('/ffffffffffffffff')).length).toBe(1);
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
		const { sent, edge } = bound(control(() => envelope({ items: [], revision: 7 })));
		const read = await resources(edge, 'account');
		expect(read.ok && read.data.revision).toBe(7);
		expect(sent.at(-1)?.url).toBe(`${URLS.control}/v1/registry/accounts`);
		const none = await resources(edge, 'planet');
		expect(!none.ok && none.failure.status).toBe(404);
	});

	it('is not asked at all by a Worker that holds no read token', async () => {
		const { sent, edge } = bound(
			control(() => envelope({})),
			{ read: '', write: WRITE },
		);
		const read = await catalog(edge);
		expect(!read.ok && read.failure.code).toBe('service_unavailable');
		expect(sent.length).toBe(0);
	});
});

describe('a write, as the console sends it', () => {
	const change = { kind: 'node' as const, ref: ID.tyo, revision: 12, patch: { retired: true } };

	it("carries the Worker's write token and the identity it was given, held to the revision read", async () => {
		// Control names the write's task too, which nothing follows: the write is done when answered.
		const answer = { revision: 13, task: 'abcdef0123456789' };
		const { sent, edge } = bound(control(() => envelope(answer, 202)));
		expect(await patch(edge, 'author@example.com', change)).toEqual({ ok: true, revision: 13 });
		const write = sent.at(-1);
		expect(write).toMatchObject({
			method: 'PATCH',
			url: `${URLS.control}/v1/registry/nodes/${ID.tyo}`,
		});
		expect(write?.headers.get('authorization')).toBe(`Bearer ${WRITE}`);
		expect(write?.headers.get('content-type')).toBe('application/json');
		expect(JSON.parse(write?.body ?? '')).toEqual({
			by: 'author@example.com',
			revision: 12,
			spec: { retired: true },
		});
	});

	it('creates a named kind by its name at revision 0', async () => {
		const { sent, edge } = bound(control(() => envelope({ revision: 1 })));
		await create(edge, 'author@example.com', { kind: 'app', name: 'shot', spec: {} });
		expect(sent.at(-1)).toMatchObject({
			method: 'PUT',
			url: `${URLS.control}/v1/registry/apps/shot`,
		});
		expect(JSON.parse(sent.at(-1)?.body ?? '')).toMatchObject({ revision: 0 });
	});

	it('creates a kind with no name by a POST to its collection, answering the id drawn', async () => {
		const answer = { revision: 2, id: 'fedcba9876543210', task: '0123456789abcdef' };
		const { sent, edge } = bound(control(() => envelope(answer, 202)));
		const made = await create(edge, 'author@example.com', { kind: 'account', spec: {} });
		expect(made).toEqual({ ok: true, revision: 2, id: 'fedcba9876543210' });
		expect(sent.at(-1)).toMatchObject({
			method: 'POST',
			url: `${URLS.control}/v1/registry/accounts`,
		});
		expect(JSON.parse(sent.at(-1)?.body ?? '')).toEqual({
			by: 'author@example.com',
			revision: 0,
			spec: {},
		});
	});

	it('refuses a name for a kind with none, and none for a named kind, sending nothing', async () => {
		const { sent, edge } = bound(control(() => envelope({})));
		const named = await create(edge, 'a', { kind: 'account', name: 'oci-2', spec: {} });
		expect(!named.ok && named.failure.code).toBe('invalid_name');
		const unnamed = await create(edge, 'a', { kind: 'app', spec: {} });
		expect(!unnamed.ok && unnamed.failure.code).toBe('invalid_name');
		expect(sent.filter((one) => one.method !== 'GET').length).toBe(0);
	});

	it('says unchanged where no revision came back, and passes a refusal on with its code', async () => {
		vi.spyOn(console, 'error').mockImplementation(() => {});
		const same = bound(control(() => envelope({})));
		expect(await patch(same.edge, 'a', change)).toEqual({ ok: true, unchanged: true });
		const stale = bound(control(() => refusal(409, 'invalid_revision')));
		const refused = await patch(stale.edge, 'a', change);
		expect(!refused.ok && refused.failure).toMatchObject({ status: 409, code: 'invalid_revision' });
		expect(stale.sent.filter((one) => one.method === 'PATCH').length).toBe(1);
	});

	it('is not sent at all by a Worker that holds no write token', async () => {
		const { sent, edge } = bound(
			control(() => envelope({})),
			{ read: READ, write: '' },
		);
		const refused = await patch(edge, 'a', change);
		expect(!refused.ok && refused.failure.code).toBe('service_unavailable');
		expect(sent.length).toBe(0);
	});

	it('is never sent again after it took too long, since it may have been taken', async () => {
		const errors = vi.spyOn(console, 'error').mockImplementation(() => {});
		const { sent, edge } = bound(
			control(() => {
				throw new DOMException('The operation timed out.', 'TimeoutError');
			}),
		);
		const secret = {
			kind: 'account' as const,
			ref: 'fedcba9876543210',
			revision: 3,
			patch: { identities: [{ kind: 'email', value: 'hush-123' }] },
		};
		const refused = await patch(edge, 'a', secret);
		expect(!refused.ok && refused.failure.status).toBe(504);
		expect(sent.filter((one) => one.method === 'PATCH').map((one) => one.where)).toEqual([
			'control',
		]);
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

	it("is the nearest core's scope, narrowed by the query, with the next page's cursor when full", async () => {
		const { sent, edge } = bound(() => envelope(listed(2)));
		const page = await tasks(edge, { service: 'shot', limit: '2', kind: '' });
		expect(sent.map((one) => one.where)).toEqual([ID.tyo]);
		expect(sent[0]?.url).toBe(`${API}/ledger/tasks?service=shot&limit=2`);
		expect(page.ok && page.data.next).toBe('99:t1');
		const last = await tasks(bound(() => envelope(listed(1))).edge, { limit: '2' });
		expect(last.ok && 'next' in last.data).toBe(false);
	});

	it('passes to the next core where one is down or its Caddy answers outside the envelope', async () => {
		vi.spyOn(console, 'error').mockImplementation(() => {});
		const { sent, edge } = bound((where) => {
			if (where === ID.tyo) throw new Error('unreachable');
			if (where === ID.sin) return new Response('Bad Gateway', { status: 502 });
			return envelope(listed(1));
		});
		const read = await tasks(edge);
		expect(read.ok).toBe(true);
		expect(sent.map((one) => one.where)).toEqual([ID.tyo, ID.sin, ID.rdu]);
	});

	it('reads one task by its service and id', async () => {
		const { sent, edge } = bound(() => envelope({ id: 'x', events: [], children: [] }));
		await task(edge, 'shot', 'abc/def');
		expect(sent[0]?.url).toBe(`${API}/ledger/tasks/shot/abc%2Fdef`);
	});
});

describe('mock mode', () => {
	const untouched = new Proxy({} as Env, { get: () => ({ fetch: () => expect.unreachable() }) });
	const edge: Edge = { env: untouched, mock: true };

	it('writes to made-up data and reads it back', async () => {
		const read = await resource(edge, 'node', ID.gvx);
		if (!read.ok) throw new Error(read.failure.message);
		const written = await patch(edge, 'developer', {
			kind: 'node',
			ref: read.data.id,
			revision: read.data.revision,
			patch: { retired: true },
		});
		if (!written.ok || !('revision' in written)) throw new Error('not written');
		const after = await resource(edge, 'node', ID.gvx);
		expect(after.ok && after.data.spec.retired).toBe(true);
		expect(after.ok && after.data.revision).toBe(written.revision);
		const again = await patch(edge, 'developer', {
			kind: 'node',
			ref: ID.gvx,
			revision: read.data.revision,
			patch: {},
		});
		expect(!again.ok && again.failure.code).toBe('invalid_revision');
	});

	it("keeps an identity's masked value as written and answers it, as control does", async () => {
		const listed = await resources(edge, 'account');
		const account = listed.ok ? listed.data.items[0] : undefined;
		if (!account) throw new Error('no account made up');
		expect(account.name).toBeNull();
		const identities = [{ kind: 'email', value: 'author@example.com' }];
		await patch(edge, 'developer', {
			kind: 'account',
			ref: account.id,
			revision: account.revision,
			patch: { identities },
		});
		const after = await resource(edge, 'account', account.id);
		expect(after.ok && after.data.spec.identities).toEqual(identities);
	});

	it("changes an account's provider later, as any field", async () => {
		const listed = await resources(edge, 'account');
		const account = listed.ok ? listed.data.items[0] : undefined;
		if (!account) throw new Error('no account made up');
		const changed = await patch(edge, 'developer', {
			kind: 'account',
			ref: account.id,
			revision: account.revision,
			patch: { provider: 'azure' },
		});
		expect(changed.ok && 'revision' in changed).toBe(true);
	});

	it('refuses an identity another account at the same provider holds, an email in any case', async () => {
		const spec = (value: string) => ({
			provider: 'racknerd',
			identities: [{ kind: 'email', value }],
		});
		const first = await create(edge, 'developer', {
			kind: 'account',
			spec: spec('ops@example.com'),
		});
		expect(first.ok).toBe(true);
		const again = await create(edge, 'developer', {
			kind: 'account',
			spec: spec('OPS@example.com'),
		});
		expect(!again.ok && again.failure).toMatchObject({ status: 400, code: 'invalid_resource' });
		expect(!again.ok && again.failure.message).toContain('racknerd');
		// At another provider the same identity is another account's to hold.
		const elsewhere = await create(edge, 'developer', {
			kind: 'account',
			spec: { ...spec('ops@example.com'), provider: 'backblaze' },
		});
		expect(elsewhere.ok).toBe(true);
	});

	it('refuses an edit that would make an identity shared, as it refuses a create', async () => {
		const made = await create(edge, 'developer', {
			kind: 'account',
			spec: { provider: 'racknerd', identities: [{ kind: 'username', value: 'canmi' }] },
		});
		if (!made.ok || !('id' in made) || made.id === undefined) throw new Error('not made');
		const read = await resource(edge, 'account', made.id);
		if (!read.ok) throw new Error(read.failure.message);
		const shared = await patch(edge, 'developer', {
			kind: 'account',
			ref: made.id,
			revision: read.data.revision,
			patch: { identities: [{ kind: 'email', value: 'Ops@Example.com' }] },
		});
		expect(!shared.ok && shared.failure.code).toBe('invalid_resource');
	});

	it("attaches a node to an account and detaches it, each a write of the node's account", async () => {
		const listed = await resources(edge, 'account');
		const account = listed.ok ? listed.data.items.at(-1) : undefined;
		const before = await resource(edge, 'node', ID.sha);
		if (!account || !before.ok) throw new Error('nothing made up');
		const attached = await patch(edge, 'developer', {
			kind: 'node',
			ref: ID.sha,
			revision: before.data.revision,
			patch: { account: account.id },
		});
		expect(attached.ok && 'revision' in attached).toBe(true);
		const under = await resource(edge, 'node', ID.sha);
		expect(under.ok && under.data.spec.account).toBe(account.id);
		if (!under.ok) return;
		await patch(edge, 'developer', {
			kind: 'node',
			ref: ID.sha,
			revision: under.data.revision,
			patch: { account: null },
		});
		const detached = await resource(edge, 'node', ID.sha);
		expect(detached.ok && 'account' in detached.data.spec).toBe(false);
	});

	it('refuses a node attached to an account control does not hold', async () => {
		const before = await resource(edge, 'node', ID.buf);
		if (!before.ok) throw new Error('nothing made up');
		const refused = await patch(edge, 'developer', {
			kind: 'node',
			ref: ID.buf,
			revision: before.data.revision,
			patch: { account: 'ffffffffffffffff' },
		});
		expect(!refused.ok && refused.failure.code).toBe('invalid_resource');
	});

	it('makes an account with no name by its POST, read back by the id it answered', async () => {
		const spec = { provider: 'backblaze', identities: [{ kind: 'email', value: 'b@example.com' }] };
		const made = await create(edge, 'developer', { kind: 'account', spec });
		if (!made.ok || !('id' in made) || made.id === undefined) throw new Error('not made');
		expect(made.id).toMatch(/^[0-9a-f]{16}$/);
		const read = await resource(edge, 'account', made.id);
		expect(read.ok && read.data).toMatchObject({ id: made.id, name: null, spec });
	});
});

const app = (name: string, spec: Record<string, unknown>) => ({
	kind: 'app',
	id: `${name}`.padEnd(16, '0'),
	name,
	revision: 1,
	spec,
});
const node = (id: string, spec: Record<string, unknown>) => ({
	kind: 'node',
	id,
	name: null,
	revision: 1,
	spec,
});

/** Control holding two apps and three nodes, Singapore a core it names beside the bootstrap's. */
const holding = (where: string, url: URL) => {
	if (where === 'control' && url.pathname === '/v1/registry/apps') {
		const apps = [
			app('host', { placements: [ID.tyo], display_name: 'Host', repository: 'monoflake/infra' }),
			app('console', { placements: [], display_name: 'Console', repository: 'canmi21/web' }),
		];
		return envelope({ items: apps, revision: 9 });
	}
	if (where === 'control' && url.pathname === '/v1/registry/nodes') {
		const nodes = [
			node(ID.tyo, {
				roles: ['compute', 'core'],
				coordinates: [35.6762, 139.6503],
				city: 'Tokyo',
				country: 'JP',
			}),
			node(ID.sin, { roles: ['compute', 'core'], coordinates: [1.3644, 103.9915] }),
			node(ID.gvx, { roles: ['compute'], hosting: 'selfhost', coordinates: ['north', 17] }),
		];
		return envelope({ items: nodes, revision: 9 });
	}
	return refusal(404, 'no_such_route');
};

describe('the facts the console shows, as control holds them', () => {
	afterEach(() => forget());

	it("reads each app's name and repository and each node's city by its id, and keeps them", async () => {
		const { edge } = bound(holding);
		const store = memoryStore();
		const facts = await readFacts({ ...edge, store }, 1_000);
		expect(facts.apps).toEqual({
			host: { display: 'Host', repository: 'monoflake/infra' },
			console: { display: 'Console', repository: 'canmi21/web' },
		});
		expect(facts.nodes).toEqual({
			[ID.tyo]: {
				coordinates: [35.6762, 139.6503],
				city: 'Tokyo',
				country: 'JP',
				core: true,
				home: false,
			},
			[ID.sin]: { coordinates: [1.3644, 103.9915], core: true, home: false },
			[ID.gvx]: { core: false, home: true },
		});
		expect(await keptFacts({ ...edge, store }, 1_000 + FACTS_FRESH_MS)).toEqual({
			facts: JSON.parse(JSON.stringify(facts)),
			stale: false,
		});
		expect((await keptFacts({ ...edge, store }, 2_000 + FACTS_FRESH_MS)).stale).toBe(true);
	});

	it('asks the ledger on the cores control names once it has named them, the bootstrap before', async () => {
		const { sent, edge } = bound(holding);
		await readFacts(edge);
		expect(learnedCores()).toEqual([ID.tyo, ID.sin]);
		expect(displayOf('host')).toBe('Host');
		sent.length = 0;
		vi.spyOn(console, 'error').mockImplementation(() => {});
		await tasks(edge);
		expect(sent.map((one) => one.where)).toEqual([ID.tyo, ID.sin]);
		forget();
		expect(learnedCores()).toBeUndefined();
		expect(CORES).toEqual([ID.tyo, ID.sin, ID.rdu]);
	});

	it('asks first only where nothing is kept, then reads again behind a request a minute on', async () => {
		const { sent, edge } = bound(holding);
		const store = memoryStore();
		const deferred: Promise<unknown>[] = [];
		const defer = (reading: Promise<unknown>) => void deferred.push(reading);
		expect((await learned({ ...edge, store }, defer, 1_000)).read).toBe(true);
		expect(sent.length).toBeGreaterThan(0);
		sent.length = 0;
		await learned({ ...edge, store }, defer, 1_000 + FACTS_FRESH_MS);
		expect([sent.length, deferred.length]).toEqual([0, 0]);
		forget();
		expect((await learned({ ...edge, store }, defer, 2_000 + FACTS_FRESH_MS)).read).toBe(true);
		expect(deferred.length).toBe(1);
		await Promise.all(deferred);
		expect(sent.length).toBeGreaterThan(0);
	});

	it('draws from the last answer while control is down, and from nothing before any', async () => {
		vi.spyOn(console, 'error').mockImplementation(() => {});
		const store = memoryStore();
		const up = bound(holding);
		const kept = await readFacts({ ...up.edge, store });
		const down = bound(() => {
			throw new Error('unreachable');
		});
		expect(await readFacts({ ...down.edge, store })).toEqual(JSON.parse(JSON.stringify(kept)));
		expect(await readFacts({ ...down.edge, store: memoryStore() })).toEqual(UNREAD);
		expect((await keptFacts({ ...down.edge, store: memoryStore() })).facts.read).toBe(false);
	});
});
