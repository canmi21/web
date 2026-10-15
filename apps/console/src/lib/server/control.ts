/**
 * The platform's control plane as the console's server reaches it: control over HTTPS at
 * `URLS.control`, a read carrying its read token and a write its write token, which the Worker
 * holds and the browser never sees, with `by` from the request's Access identity, ./access.ts; and
 * the ledger on the nearest core that answers, a private scope of the API host through that node's
 * VPC binding, `api.canmi.app/ledger/...`. A spec is sent and never logged: it may hold a secret's
 * value. See platform's spec/architecture/control.md and ledger.md, and RFC cpc2b.
 */
import { URLS } from '@monoflake/sdk';
import * as v from 'valibot';
import { Catalog } from '../control/catalog.gen.ts';
import { describe } from '../control/catalog.ts';
import type {
	Create,
	List,
	Listed,
	Patch,
	Resource,
	Spec,
	TaskDetail,
	TaskPage,
	TaskQuery,
	Written,
} from '../control/types.ts';
import { type AppFact, learnApps } from '../scope/scope.ts';
import { learnPlaces } from '../map/places.ts';
import { learnFacts } from '../nodes/facts.ts';
import { kept } from './cache.ts';
import { TIMEOUT, bindingOf } from './edge.ts';
import { controlMock, ledgerMock } from './mock-control.ts';
import {
	type Coordinates,
	type Node,
	type NodeFact,
	SYSTEMS,
	TIERS,
	learnNodes,
	learnedCores,
	order,
} from './nodes.ts';
import { type Edge, type Failure, type Read, enveloped, failed, opened } from './read.ts';

/**
 * Where the console first looks for the ledger, before control has named the cores: the bootstrap,
 * never read again once it has. See RFC 17b3o.
 */
export const CORES = [
	'd132b0f553e3dcc3',
	'9d399312d1c3ddc4',
	'd62c82b23a858876',
] as const satisfies readonly Node[];

/** The API host on the tunnel's side of Caddy, which VPC sends as the `Host`. */
export const API = `http://${new URL(URLS.internal.api.private).hostname.split('.')[0]}.${
	new URL(URLS.internal.app).hostname
}`;

/** How long a write may take before it is reported as perhaps written, in milliseconds. */
const WRITE_TIMEOUT = 10_000;

/** Where control answers what the registry held, its kinds among them: its `registry` scope. */
export const SCOPE = '/v1/registry';

/** The ledger's own page size when none is asked; see its spec, "Read by the console". */
const PAGE = 50;

interface Asking {
	method: 'GET' | 'POST' | 'PUT' | 'PATCH';
	body?: string;
	token?: string;
	timeout: number;
}

/** Whether a failure is the node's rather than the service's answer, so the next may be asked. */
const elsewhere = (failure: Failure) => failure.status >= 500 || failure.code === 'no_such_route';

/** The request `asking` makes. */
function initOf(asking: Asking): RequestInit {
	const headers = new Headers({ accept: 'application/json' });
	if (asking.body !== undefined) headers.set('content-type', 'application/json');
	if (asking.token) headers.set('authorization', `Bearer ${asking.token}`);
	return { method: asking.method, headers, body: asking.body };
}

/** Whether `error` is a timeout of a write, which may have been taken and is never sent again. */
const writeTimedOut = (error: unknown, asking: Asking) =>
	error instanceof DOMException && error.name === 'TimeoutError' && asking.method !== 'GET';

/** What a write that timed out is answered: the reader reads before writing again. */
const unsure = () =>
	failed(504, 'upstream_unavailable', 'No answer in time; read it again to see.');

/**
 * `path` under the API host, of the first of `nodes` whose service answers in the envelope. A write
 * that timed out is not sent again: it may have been taken, and the reader reads before writing
 * again, as a revision refused would make them do anyway.
 */
async function asked<T>(edge: Edge, nodes: readonly Node[], path: string, asking: Asking) {
	const init = initOf(asking);
	let last: Read<T> = failed(502, 'upstream_unavailable', 'No node holding it answered.');
	for (const node of nodes) {
		try {
			const signal = AbortSignal.timeout(asking.timeout);
			const answer = edge.mock
				? ledgerMock(path)
				: bindingOf(edge.env, node)?.fetch(`${API}${path}`, { ...init, signal });
			if (answer === undefined) continue;
			last = await opened<T>(node, await answer);
			if (last.ok || !elsewhere(last.failure)) return last;
			console.error(`control: ${node} answered ${asking.method} ${path} ${last.failure.status}`);
		} catch (error) {
			console.error(`control: ${node} did not answer ${asking.method} ${path}: ${String(error)}`);
			if (writeTimedOut(error, asking)) return unsure();
		}
	}
	return last;
}

/** The cores control last named, else the bootstrap's, nearest the reader first. */
const cores = (edge: Edge) => {
	const named: readonly Node[] = learnedCores() ?? CORES;
	return order(edge.where).filter((node) => named.includes(node));
};

/**
 * `path` under control's `SCOPE`, over HTTPS, with the read token where `asking` carries no other;
 * made up in mock mode. One place answers it, so nothing is asked again elsewhere.
 */
async function control<T>(edge: Edge, path: string, more: Partial<Asking> = {}): Promise<Read<T>> {
	const asking: Asking = { method: 'GET', timeout: TIMEOUT, ...more };
	const token = asking.token ?? edge.env.CONTROL_READ_TOKEN;
	if (!edge.mock && !token) {
		return failed(503, 'service_unavailable', 'This console holds no token for control.');
	}
	const init = { ...initOf({ ...asking, token }), signal: AbortSignal.timeout(asking.timeout) };
	try {
		const answer = edge.mock
			? await controlMock(`${SCOPE}${path}`, init)
			: await fetch(`${URLS.control}${SCOPE}${path}`, init);
		const read = await enveloped<T>('control', answer);
		if (!read.ok) {
			console.error(`control: answered ${asking.method} ${path} ${read.failure.status}`);
		}
		return read;
	} catch (error) {
		console.error(`control: did not answer ${asking.method} ${path}: ${String(error)}`);
		if (writeTimedOut(error, asking)) return unsure();
		return failed(502, 'upstream_unavailable', 'Control did not answer.');
	}
}

const answered = (read: Read<unknown>) => read.ok;

/**
 * Every kind control holds, read through its generated schema; kept a minute, since a kind or a
 * field changes only with a deploy of control.
 */
export function catalog(edge: Edge): Promise<Read<Catalog>> {
	return kept(edge, 'control catalog', 60, () => catalogNow(edge), answered);
}

async function catalogNow(edge: Edge): Promise<Read<Catalog>> {
	const read = await control<unknown>(edge, '/kinds');
	if (!read.ok) return read;
	const parsed = v.safeParse(Catalog, read.data);
	if (parsed.success) return { ...read, data: parsed.output };
	const where = parsed.issues.map((issue) => v.getDotPath(issue) ?? '(root)').join(', ');
	console.error(`control: the catalog does not read at ${where}`);
	return failed(502, 'upstream_unavailable', `The catalog does not read at ${where}.`);
}

/** `kind` as the catalog describes it, or why there is none. */
async function describedAs(catalogRead: Promise<Read<Catalog>>, kind: string) {
	const read = await catalogRead;
	if (!read.ok) return read;
	const described = describe(read.data, kind);
	if (described === undefined) return failed(404, 'no_such_resource', `No kind is named ${kind}.`);
	return { ...read, data: described };
}

/** The route of `kind`, as the catalog names it, or why there is none. */
async function pluralOf(catalogRead: Promise<Read<Catalog>>, kind: string) {
	const described = await describedAs(catalogRead, kind);
	return described.ok ? { ...described, data: described.data.plural } : described;
}

const segment = (ref: string) => encodeURIComponent(ref);

/** Every resource of `kind`, by the catalog's route for it. */
export async function resources(
	edge: Edge,
	kind: string,
	catalogRead = catalog(edge),
): Promise<Read<List>> {
	const plural = await pluralOf(catalogRead, kind);
	return plural.ok ? control<List>(edge, `/${plural.data}`) : plural;
}

/** One resource of `kind`, by its id or its name. */
export async function resource(
	edge: Edge,
	kind: string,
	ref: string,
	catalogRead = catalog(edge),
): Promise<Read<Resource>> {
	const plural = await pluralOf(catalogRead, kind);
	return plural.ok ? control<Resource>(edge, `/${plural.data}/${segment(ref)}`) : plural;
}

/** Control's answer to a write as the console reports it: no revision where nothing changed. */
function writtenOf(read: Read<{ revision?: number; id?: string }>): Written {
	if (!read.ok) return read;
	const { revision, id } = read.data;
	if (revision === undefined) return { ok: true, unchanged: true };
	return { ok: true, revision, ...(id === undefined ? {} : { id }) };
}

const refused = (status: number, code: string, message: string): Written => ({
	ok: false,
	failure: { status, code, message },
});

/** A refusal where this console holds no token to write with, so nothing is asked first. */
const unwritable = (edge: Edge): Written | undefined =>
	edge.mock || edge.env.CONTROL_WRITE_TOKEN
		? undefined
		: refused(503, 'service_unavailable', 'This console does not write.');

/** `body` sent by `method` to `path` under control's `SCOPE`, with the Worker's write token. */
async function write(
	edge: Edge,
	method: 'POST' | 'PUT' | 'PATCH',
	path: string,
	body: { by: string; revision: number; spec: Spec },
): Promise<Written> {
	const token = edge.env.CONTROL_WRITE_TOKEN;
	const asking = { method, body: JSON.stringify(body), token, timeout: WRITE_TIMEOUT };
	return writtenOf(await control(edge, path, asking));
}

/**
 * A resource made at revision 0, as `by`: a named kind's by `PUT` at its name, a kind with no name
 * by `POST` to its collection, answered with the id control drew -- platform's RFC 32hd9.
 */
export async function create(edge: Edge, by: string, made: Create): Promise<Written> {
	const { kind, name, spec } = made;
	const closed = unwritable(edge);
	if (closed) return closed;
	const described = await describedAs(catalog(edge), kind);
	if (!described.ok) return described;
	const { named, plural } = described.data;
	const body = { by, revision: 0, spec };
	if (!named) {
		if (name !== undefined) return refused(400, 'invalid_name', `The ${kind} kind has no name.`);
		return write(edge, 'POST', `/${plural}`, body);
	}
	if (!name) return refused(400, 'invalid_name', `The ${kind} kind is made by its name.`);
	return write(edge, 'PUT', `/${plural}/${segment(name)}`, body);
}

/** A resource changed by a merge patch, held to the revision it was read at, as `by`. */
export async function patch(edge: Edge, by: string, change: Patch): Promise<Written> {
	const { kind, ref, revision, patch: spec } = change;
	const closed = unwritable(edge);
	if (closed) return closed;
	const plural = await pluralOf(catalog(edge), kind);
	if (!plural.ok) return plural;
	return write(edge, 'PATCH', `/${plural.data}/${segment(ref)}`, { by, revision, spec });
}

function ledger<T>(edge: Edge, path: string): Promise<Read<T>> {
	return asked<T>(edge, cores(edge), `/ledger${path}`, { method: 'GET', timeout: TIMEOUT });
}

const QUERIED = ['service', 'state', 'kind', 'caller', 'parent', 'before', 'limit'] as const;

/** A page of the ledger's tasks, newest first, narrowed by `query`. */
export async function tasks(edge: Edge, query: TaskQuery = {}): Promise<Read<TaskPage>> {
	const narrowed = new URLSearchParams();
	for (const key of QUERIED) if (query[key]) narrowed.set(key, query[key]);
	const read = await ledger<Listed[]>(edge, `/tasks${narrowed.size > 0 ? `?${narrowed}` : ''}`);
	if (!read.ok) return read;
	const limit = Number.parseInt(query.limit ?? '', 10) || PAGE;
	const last = read.data.at(-1);
	const next = read.data.length >= limit && last ? { next: last.cursor } : {};
	return { ...read, data: { items: read.data, ...next } };
}

/** One task, its events in order, and the tasks it started. */
export function task(edge: Edge, service: string, id: string): Promise<Read<TaskDetail>> {
	return ledger<TaskDetail>(edge, `/tasks/${segment(service)}/${segment(id)}`);
}

/**
 * The facts the console shows of other repositories, from where they are kept: each app's display
 * name and repository, and each node's city, country, role, tier, system and expiry, all as control
 * holds them, a node by its id -- RFC 17b3o. `read` is false where it has never answered and
 * nothing is kept.
 */
export interface Facts {
	readonly apps: Readonly<Record<string, AppFact>>;
	readonly nodes: Readonly<Record<string, NodeFact>>;
	readonly read: boolean;
}

/** What the console shows before control has ever answered. */
export const UNREAD: Facts = { apps: {}, nodes: {}, read: false };

/** Control's last answer, and when it was read, in milliseconds. */
interface Held {
	readonly facts: Facts;
	readonly at: number;
}

const FACTS = 'control facts';
/** How old a kept answer may be before it is read again behind the page that uses it. */
export const FACTS_FRESH_MS = 60_000;
/** How long the last answer is kept: the console draws from it while control is down. */
const FACTS_KEPT_SECONDS = 30 * 86_400;

const text = (value: unknown) => (typeof value === 'string' && value ? value : undefined);

/** `value` where it is one of `known`. */
const oneOf = <T extends string>(value: unknown, known: readonly T[]) =>
	known.find((one) => one === value);

function coordinatesOf(value: unknown): Coordinates | undefined {
	if (!Array.isArray(value) || value.length !== 2) return undefined;
	const [latitude, longitude] = value;
	return Number.isFinite(latitude) && Number.isFinite(longitude)
		? [latitude as number, longitude as number]
		: undefined;
}

/** The facts in two lists control answered: an app by its name, a node by its id. */
function factsOf(apps: List, nodes: List): Facts {
	const named = (list: List) => list.items.filter((item) => item.name !== null);
	return {
		apps: Object.fromEntries(
			named(apps).map(({ name, spec }) => {
				const fact = { display: text(spec.display_name), repository: text(spec.repository) };
				return [name, fact];
			}),
		),
		nodes: Object.fromEntries(
			nodes.items.map(({ id, spec }) => {
				const roles = Array.isArray(spec.roles) ? spec.roles : [];
				const core = roles.includes('core') || spec.core === true;
				const home = spec.hosting === 'selfhost' || spec.tier === 'home';
				const at = {
					coordinates: coordinatesOf(spec.coordinates),
					city: text(spec.city),
					country: text(spec.country),
				};
				const declared = {
					tier: oneOf(spec.tier, TIERS),
					system: oneOf(spec.system, SYSTEMS),
					expiry: Number.isInteger(spec.expiry) ? (spec.expiry as number) : undefined,
				};
				return [id, { ...at, core, home, ...declared }];
			}),
		),
		read: true,
	};
}

/** The last answer this isolate took in, which it answers from for a minute without asking. */
let latest: Held | undefined;

/** `facts`, read at `at`, taken in by everything that draws a name, a scope or a nearest node. */
function learn(facts: Facts, at: number): Facts {
	learnApps(facts.apps);
	learnNodes(facts.nodes);
	learnPlaces(facts.nodes);
	learnFacts(facts.nodes);
	if (facts.read) latest = { facts, at };
	return facts;
}

/** The last answer kept, asking no one, taken in; and whether it is due a read again. */
export async function keptFacts(
	edge: Edge,
	now = Date.now(),
): Promise<{ facts: Facts; stale: boolean }> {
	const held = (await edge.store?.get(FACTS).catch(() => undefined)) as Held | undefined;
	if (held === undefined) return { facts: UNREAD, stale: true };
	return { facts: learn(held.facts, held.at), stale: now - held.at > FACTS_FRESH_MS };
}

/**
 * The facts read from control now, kept as the last answer and their nodes taken in; where it does
 * not answer, the last answer kept, else `UNREAD`.
 */
export async function readFacts(edge: Edge, now = Date.now()): Promise<Facts> {
	const [apps, nodes] = await Promise.all([
		control<List>(edge, '/apps'),
		control<List>(edge, '/nodes'),
	]);
	if (!apps.ok || !nodes.ok) return (await keptFacts(edge, now)).facts;
	const facts = learn(factsOf(apps.data, nodes.data), now);
	await edge.store
		?.put(FACTS, { facts, at: now } satisfies Held, FACTS_KEPT_SECONDS)
		.catch(() => {});
	return facts;
}

/**
 * The facts, taken in before anything on the server reads them: this isolate's for a minute, else
 * the kept answer, read again behind the request by `defer` once a minute old; only where nothing
 * is kept is control asked first.
 */
export async function learned(
	edge: Edge,
	defer: (reading: Promise<unknown>) => void,
	now = Date.now(),
): Promise<Facts> {
	if (latest !== undefined && now - latest.at <= FACTS_FRESH_MS) return latest.facts;
	const kept = await keptFacts(edge, now);
	if (!kept.facts.read) return readFacts(edge, now);
	if (kept.stale) defer(readFacts(edge, now));
	return kept.facts;
}

/** Forgets what this isolate took in, as a fresh one starts; for tests. */
export function forget(): void {
	latest = undefined;
	learn(UNREAD, 0);
}
