/**
 * The registry and the ledger as development's mock mode answers them: made up, shaped as their
 * answers are, and kept in the one process `vite dev` runs, so a write is read back as written and
 * its task is in the list. Never in the build -- only an `Edge` with `mock` set asks; ./mode.ts.
 */
import { applied, same } from '../control/patch.ts';
import type { Drift, Listed, Resource, Spec, Task, TaskEvent } from '../control/types.ts';
import { NODES, type Node } from './nodes.ts';

/** 16 hexadecimal digits, the same for the same words, as a resource's id is shaped. */
function idOf(...words: string[]): string {
	let a = 2166136261;
	let b = 33554467;
	for (const char of words.join('/')) {
		a = Math.imul(a ^ char.charCodeAt(0), 16777619);
		b = Math.imul(b ^ char.charCodeAt(0), 2246822507);
	}
	return [a, b].map((half) => (half >>> 0).toString(16).padStart(8, '0')).join('');
}

const field = (name: string, type: string, more: Spec = {}) => ({
	name,
	type,
	editable: true,
	required: false,
	...more,
});

const CATALOG = {
	items: [
		{
			name: 'node',
			plural: 'nodes',
			named: true,
			fields: [
				field('address', 'string', { required: true }),
				field('tier', 'choice', { required: true, choices: ['datacenter', 'home', 'transient'] }),
				field('system', 'choice', { required: true, choices: ['debian', 'alpine'] }),
				field('core', 'boolean'),
				field('expiry', 'integer'),
				field('retired', 'boolean'),
				field('hosting', 'choice', { choices: ['datacenter', 'selfhost'] }),
				field('account', 'reference', { kind: 'account' }),
				field('roles', 'list', { choices: ['compute', 'storage', 'core'] }),
			],
			actions: [],
			columns: ['address', 'tier', 'account', 'system'],
		},
		{
			name: 'app',
			plural: 'apps',
			named: true,
			fields: [field('placements', 'list', { required: true }), field('release', 'object')],
			actions: [],
			columns: ['placements'],
		},
		{
			name: 'account',
			plural: 'accounts',
			named: false,
			fields: [
				field('provider', 'choice', {
					required: true,
					choices: ['oracle', 'azure', 'racknerd', 'backblaze', 'cloudflare'],
				}),
				field('identities', 'list', {
					required: true,
					fields: [
						field('kind', 'choice', {
							required: true,
							choices: ['account_id', 'username', 'email'],
						}),
						field('value', 'string', { required: true, masked: true }),
					],
				}),
			],
			actions: [],
			columns: ['provider'],
		},
	],
};

const KINDS = Object.fromEntries(CATALOG.items.map((one) => [one.plural, one.name]));
const CORES = new Set(['tyo', 'sin', 'rdu']);
const APPS: Record<string, Node[]> = {
	relay: Object.keys(NODES) as Node[],
	registry: ['tyo', 'sin', 'rdu'],
	ledger: ['tyo', 'sin', 'rdu'],
	gateway: ['tyo', 'rdu'],
	objects: ['tyo', 'sin', 'gvx'],
	shot: ['sin', 'buf'],
};

const now = () => new Date().toISOString();

interface Held {
	revision: number;
	resources: Resource[];
	tasks: { task: Task; events: TaskEvent[] }[];
}

let held: Held | undefined;

function made(
	kind: Resource['kind'],
	name: string | null,
	revision: number,
	spec: Spec,
	id = idOf(kind, name ?? ''),
): Resource {
	return { kind, id, name, revision, spec };
}

/** The kinds made by a `POST` with no name, as the catalog marks them. */
const UNNAMED = new Set(CATALOG.items.filter((one) => !one.named).map((one) => one.name));

/** The made-up registry and ledger, made once a process. */
function state(): Held {
	if (held) return held;
	let revision = 0;
	const account = made(
		'account',
		null,
		++revision,
		{
			provider: 'oracle',
			identities: [
				{ kind: 'account_id', value: `ocid1.tenancy.oc1..${idOf('account_id')}` },
				{ kind: 'email', value: 'oracle@example.com' },
			],
		},
		idOf('account', 'oracle'),
	);
	const cloud = made(
		'account',
		null,
		++revision,
		{ provider: 'cloudflare', identities: [{ kind: 'email', value: 'edge@example.com' }] },
		idOf('account', 'cloudflare'),
	);
	const nodes = (Object.keys(NODES) as Node[]).map((node, index) => {
		const home = node === 'sha' || node === 'buf';
		const spec: Spec = {
			address: `100.64.0.${index + 1}`,
			tier: home ? 'home' : 'datacenter',
			system: 'debian',
			hosting: home ? 'selfhost' : 'datacenter',
			roles: CORES.has(node) ? ['compute', 'core'] : ['compute'],
			...(CORES.has(node) ? { core: true } : {}),
			...(home ? {} : { account: account.id }),
		};
		return made('node', node, ++revision, spec);
	});
	const apps = Object.entries(APPS).map(([name, placements], index) => {
		const release = {
			repository: 'canmi21/platform',
			run: 400 + index,
			commit: idOf(name).repeat(3).slice(0, 40),
		};
		return made('app', name, ++revision, { placements, release });
	});
	held = { revision, resources: [account, cloud, ...nodes, ...apps], tasks: [] };
	for (const [index, service] of ['shot', 'deployer', 'shot', 'cron'].entries()) {
		const failedOne = index === 2;
		record(
			held,
			{
				service,
				id: idOf(service, String(index)),
				kind: service === 'shot' ? 'capture' : 'run',
				state: failedOne ? 'failed' : 'done',
				summary: { index },
				...(failedOne ? { detail: 'The page did not load in time.' } : {}),
			},
			['queued', 'running', failedOne ? 'failed' : 'done'],
		);
	}
	return held;
}

/** A task appended to the ledger, done at once, with one event a stage. */
function record(
	into: Held,
	task: Omit<Task, 'caller' | 'asked_at' | 'updated_at'>,
	stages: string[],
) {
	const at = now();
	const events = stages.map((stage, index) => ({
		service: task.service,
		task: task.id,
		seq: Date.now() * 1e6 + index,
		at,
		stage,
		level: stage === 'failed' ? ('error' as const) : ('info' as const),
		message: stage === 'written' ? 'Written.' : `${stage[0]?.toUpperCase()}${stage.slice(1)}.`,
	}));
	const whole: Task = {
		caller: 'ours',
		asked_at: at,
		started_at: at,
		finished_at: at,
		updated_at: at,
		...task,
	};
	into.tasks.unshift({ task: whole, events });
}

const success = (data: unknown, status = 200) =>
	Response.json({ status: 'success', data }, { status });
const refused = (status: number, code: string, message: string) =>
	Response.json({ status: 'error', code, message }, { status });

/** Made-up answers of `api.canmi.app` for `path`: the registry's `/v1` and the ledger's tasks. */
export async function controlMock(path: string, init: RequestInit = {}): Promise<Response> {
	const [pathname = '', query = ''] = path.split(/\?(.*)/s);
	const parts = pathname.split('/').filter(Boolean).map(decodeURIComponent);
	const method = init.method ?? 'GET';
	if (parts[0] === 'ledger') return ledger(parts.slice(1), new URLSearchParams(query));
	if (parts[0] !== 'registry' || parts[1] !== 'v1')
		return refused(404, 'no_such_route', 'No such route.');
	const [, , plural, ref] = parts;
	if (plural === 'kinds' && method === 'GET') return success(CATALOG);
	const kind = KINDS[plural ?? ''] as Resource['kind'] | undefined;
	if (!kind) return refused(404, 'no_such_kind', `No kind is reached at ${plural}.`);
	const all = state();
	const found = all.resources.find(
		(one) => one.kind === kind && (one.id === ref || one.name === ref),
	);
	if (method === 'GET') {
		if (ref === undefined)
			return success({
				items: all.resources.filter((one) => one.kind === kind),
				revision: all.revision,
			});
		return found
			? success(found)
			: refused(
					404,
					kind === 'node' ? 'no_such_node' : 'no_such_resource',
					`No ${kind} is ${ref}.`,
				);
	}
	const body = JSON.parse(String(init.body ?? '{}')) as Spec;
	if (ref !== undefined) return written(all, kind, ref, found, method, body);
	if (method !== 'POST') return refused(404, 'no_such_route', 'No such route.');
	if (!UNNAMED.has(kind)) return refused(405, 'invalid_method', `A ${kind} is made by its PUT.`);
	return written(
		all,
		kind,
		idOf(kind, String(Date.now()), String(Math.random())),
		undefined,
		method,
		body,
	);
}

/** A write to the made-up registry, refused as the registry refuses it. */
function written(
	all: Held,
	kind: Resource['kind'],
	ref: string,
	found: Resource | undefined,
	method: string,
	body: Spec,
) {
	if ('status' in body || 'drift' in body)
		return refused(400, 'forbidden_field', 'Not written by a person.');
	// A kind with no name is made by its POST alone, never at a route of its own.
	if ((method === 'PATCH' || UNNAMED.has(kind)) && method !== 'POST' && !found)
		return refused(404, 'no_such_resource', `No ${kind} is ${ref}.`);
	if (body.revision !== (found?.revision ?? 0))
		return refused(409, 'invalid_revision', 'It changed since it was read.');
	const spec = (method === 'PATCH' ? applied(found?.spec ?? {}, body.spec) : body.spec) as Spec;
	const problem = invalid(all, kind, found, spec);
	if (problem !== undefined) return refused(400, 'invalid_resource', problem);
	if (found && same(found.spec, spec)) return success({});
	const revision = ++all.revision;
	const name = found ? found.name : UNNAMED.has(kind) ? null : ref;
	const resource = made(kind, name, revision, spec, found?.id ?? (name === null ? ref : undefined));
	all.resources = [...all.resources.filter((one) => one !== found), resource];
	const id = idOf('task', String(revision), String(Date.now()));
	record(
		all,
		{
			service: 'registry',
			id,
			kind: 'write',
			state: 'done',
			summary: { kind, id: resource.id, name: resource.name, revision },
		},
		['written'],
	);
	const drawn = method === 'POST' ? { id: resource.id } : {};
	return success({ revision, task: id, ...drawn }, 202);
}

/** An identity as the registry compares two: an email by its letters whatever their case. */
const sameIdentity = (a: Spec, b: Spec) =>
	a.kind === b.kind &&
	(a.kind === 'email'
		? String(a.value).toLowerCase() === String(b.value).toLowerCase()
		: a.value === b.value);

/**
 * Why the registry refuses `spec` for what it holds: an account sharing an identity with another at
 * the same provider, or a node naming an account it does not hold.
 */
function invalid(all: Held, kind: Resource['kind'], found: Resource | undefined, spec: Spec) {
	if (kind === 'account') {
		const mine = Array.isArray(spec.identities) ? (spec.identities as Spec[]) : [];
		const shared = all.resources.find(
			(one) =>
				one.kind === 'account' &&
				one.id !== found?.id &&
				one.spec.provider === spec.provider &&
				Array.isArray(one.spec.identities) &&
				(one.spec.identities as Spec[]).some((theirs) =>
					mine.some((ours) => sameIdentity(theirs, ours)),
				),
		);
		if (shared) return `Another ${String(spec.provider)} account holds one of these identities.`;
	}
	const account = spec.account;
	const held = (id: unknown) =>
		all.resources.some((one) => one.kind === 'account' && one.id === id);
	if (kind === 'node' && account !== undefined && !held(account)) {
		return `No account is ${String(account)}.`;
	}
	return undefined;
}

function ledger(parts: string[], query: URLSearchParams): Response {
	const all = state();
	if (parts[0] !== 'tasks') return refused(404, 'no_such_route', 'No such route.');
	if (parts.length === 3) {
		const one = all.tasks.find(({ task }) => task.service === parts[1] && task.id === parts[2]);
		if (!one) return refused(404, 'no_such_task', 'No such task.');
		return success({ ...one.task, events: one.events, children: [] });
	}
	const matches = (task: Task) =>
		(['service', 'state', 'kind', 'caller'] as const).every(
			(key) => !query.has(key) || task[key] === query.get(key),
		);
	const listed: Listed[] = all.tasks.map(({ task }, index) => ({
		...task,
		cursor: `${all.tasks.length - index}:${task.id}`,
	}));
	const before = Number.parseInt(query.get('before') ?? '', 10);
	const limit = Math.min(500, Math.max(1, Number.parseInt(query.get('limit') ?? '', 10) || 50));
	const after = listed.filter(
		(one) => matches(one) && (Number.isNaN(before) || Number.parseInt(one.cursor, 10) < before),
	);
	return success(after.slice(0, limit));
}

/** A node's made-up drift: a core runs an app behind, and the house runs one not wanted. */
export function driftMock(node: Node): Drift {
	return {
		...(node === 'sin' ? { wanted_not_running: ['shot'] } : {}),
		...(node === 'sha' ? { running_not_wanted: ['objects'] } : {}),
		...(node === 'tyo'
			? {
					release_behind: [
						{
							app: 'gateway',
							wanted: { run: 403, commit: idOf('gateway').repeat(3).slice(0, 40) },
							running: { run: 401 },
						},
					],
				}
			: {}),
		registry_revision: state().revision,
		read_at: now(),
		source: node === 'buf' ? 'cache' : 'registry',
	};
}
