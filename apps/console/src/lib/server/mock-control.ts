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
			fields: [
				field('address', 'string', { required: true }),
				field('tier', 'choice', { required: true, choices: ['datacenter', 'home', 'transient'] }),
				field('domain', 'reference', { required: true, kind: 'domain' }),
				field('system', 'choice', { required: true, choices: ['debian', 'alpine'] }),
				field('core', 'boolean'),
				field('expiry', 'integer'),
				field('retired', 'boolean'),
				field('hosting', 'choice', { choices: ['datacenter', 'selfhost'] }),
				field('account', 'reference', { kind: 'account' }),
				field('roles', 'list', { choices: ['compute', 'storage', 'core'] }),
			],
			actions: [],
			columns: ['address', 'tier', 'domain', 'system'],
		},
		{
			name: 'app',
			plural: 'apps',
			fields: [field('placements', 'list', { required: true }), field('release', 'object')],
			actions: [],
			columns: ['placements'],
		},
		{
			name: 'account',
			plural: 'accounts',
			fields: [
				field('provider', 'string', { required: true }),
				field('identities', 'list', {
					required: true,
					fields: [
						field('kind', 'choice', { required: true, choices: ['user_id', 'tenancy', 'email'] }),
						field('value', 'string', { secret: true }),
						field('secret', 'string', { editable: false }),
					],
				}),
			],
			actions: [],
			columns: ['provider'],
		},
		{
			name: 'domain',
			plural: 'domains',
			fields: [field('note', 'string')],
			actions: [],
			columns: ['note'],
		},
	],
};

const KINDS = Object.fromEntries(CATALOG.items.map((one) => [one.plural, one.name]));
const CORES = new Set(['tyo', 'sin', 'rdu']);
const APPS: Record<string, Node[]> = {
	relay: Object.keys(NODES) as Node[],
	registry: ['tyo', 'sin', 'rdu'],
	ledger: ['rdu'],
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

function made(kind: Resource['kind'], name: string, revision: number, spec: Spec): Resource {
	return { kind, id: idOf(kind, name), name, revision, spec };
}

/** The made-up registry and ledger, made once a process. */
function state(): Held {
	if (held) return held;
	let revision = 0;
	const domains = ['oci-1', 'oci-2', 'home'].map((name) =>
		made('domain', name, ++revision, name === 'home' ? { note: 'The house.' } : {}),
	);
	const account = made('account', 'oci-2', ++revision, {
		provider: 'oracle',
		identities: [
			{
				kind: 'tenancy',
				secret: `accounts/registry/ACCOUNT_${idOf('account', 'oci-2').toUpperCase()}_TENANCY`,
			},
		],
	});
	const nodes = (Object.keys(NODES) as Node[]).map((node, index) => {
		const home = node === 'sha' || node === 'buf';
		const spec: Spec = {
			address: `100.64.0.${index + 1}`,
			tier: home ? 'home' : 'datacenter',
			domain: (home ? domains[2] : domains[index % 2])?.id,
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
	held = { revision, resources: [...domains, account, ...nodes, ...apps], tasks: [] };
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
	if (ref === undefined) return refused(404, 'no_such_route', 'No such route.');
	return written(all, kind, ref, found, method, JSON.parse(String(init.body ?? '{}')) as Spec);
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
	if (method === 'PATCH' && !found)
		return refused(404, 'no_such_resource', `No ${kind} is ${ref}.`);
	if (body.revision !== (found?.revision ?? 0))
		return refused(409, 'invalid_revision', 'It changed since it was read.');
	const spec = (method === 'PUT' ? body.spec : applied(found?.spec ?? {}, body.spec)) as Spec;
	const kept = stored(kind, ref, spec);
	if (found && same(found.spec, kept)) return success({});
	const revision = ++all.revision;
	const resource = made(kind, found?.name ?? ref, revision, kept);
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
	return success({ revision, task: id }, 202);
}

/** `spec` as the registry keeps it: an identity's value handed on, only its name kept. */
function stored(kind: Resource['kind'], ref: string, spec: Spec): Spec {
	if (kind !== 'account' || !Array.isArray(spec.identities)) return spec;
	const identities = spec.identities.map((one: Spec) => {
		if (!('value' in one)) return one;
		const name = `accounts/registry/ACCOUNT_${idOf('account', ref).toUpperCase()}_${String(one.kind).toUpperCase()}`;
		return { kind: one.kind, secret: name };
	});
	return { ...spec, identities };
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
