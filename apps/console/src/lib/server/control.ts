/**
 * The platform's control plane as the console's server reaches it: the registry on the nearest core
 * that answers and the ledger on its node, each a private scope of the API host through that node's
 * VPC binding -- `api.canmi.app/registry/...`, `api.canmi.app/ledger/...` -- and a write carrying
 * the registry's token, which the Worker holds and the browser never sees, with `by` from the
 * request's Access identity, ./access.ts. A spec is sent and never logged: it may hold a secret's
 * value. See platform's spec/architecture/registry.md and ledger.md, and RFC cpc2b.
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
import { kept } from './cache.ts';
import { TIMEOUT, bindingOf } from './edge.ts';
import { controlMock } from './mock-control.ts';
import { type Node, order } from './nodes.ts';
import { type Edge, type Failure, type Read, failed, opened } from './read.ts';

/**
 * The cores the registry and the ledger run on, any of them answering alike: each one's
 * `service.toml`'s placements.
 */
export const CORES = ['tyo', 'sin', 'rdu'] as const satisfies readonly Node[];

/** The API host on the tunnel's side of Caddy, which VPC sends as the `Host`. */
export const API = `http://${new URL(URLS.internal.api.private).hostname.split('.')[0]}.${
	new URL(URLS.internal.app).hostname
}`;

/** How long a write may take before it is reported as perhaps written, in milliseconds. */
const WRITE_TIMEOUT = 10_000;

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

/** `path` under the API host on `node`, made up in mock mode; undefined where it is not bound. */
function reached(edge: Edge, node: Node, path: string, init: RequestInit) {
	if (edge.mock) return controlMock(path, init);
	return bindingOf(edge.env, node)?.fetch(`${API}${path}`, init);
}

/**
 * `path` under the API host, of the first of `nodes` whose service answers in the envelope. A write
 * that timed out is not sent again: it may have been taken, and the reader reads before writing
 * again, as a revision refused would make them do anyway.
 */
async function asked<T>(edge: Edge, nodes: readonly Node[], path: string, asking: Asking) {
	const headers = new Headers({ accept: 'application/json' });
	if (asking.body !== undefined) headers.set('content-type', 'application/json');
	if (asking.token) headers.set('authorization', `Bearer ${asking.token}`);
	const init = { method: asking.method, headers, body: asking.body };
	let last: Read<T> = failed(502, 'upstream_unavailable', 'No node holding it answered.');
	for (const node of nodes) {
		try {
			const signal = AbortSignal.timeout(asking.timeout);
			const answer = reached(edge, node, path, { ...init, signal });
			if (answer === undefined) continue;
			last = await opened<T>(node, await answer);
			if (last.ok || !elsewhere(last.failure)) return last;
			console.error(`control: ${node} answered ${asking.method} ${path} ${last.failure.status}`);
		} catch (error) {
			const timedOut = error instanceof DOMException && error.name === 'TimeoutError';
			console.error(`control: ${node} did not answer ${asking.method} ${path}: ${String(error)}`);
			if (timedOut && asking.method !== 'GET') {
				return failed(504, 'upstream_unavailable', 'No answer in time; read it again to see.');
			}
		}
	}
	return last;
}

/** The cores, nearest the reader first. */
const cores = (edge: Edge) => order(edge.where).filter((node) => CORES.some((one) => one === node));

function registry<T>(edge: Edge, path: string, asking: Partial<Asking> = {}) {
	return asked<T>(edge, cores(edge), `/registry/v1${path}`, {
		method: 'GET',
		timeout: TIMEOUT,
		...asking,
	});
}

const answered = (read: Read<unknown>) => read.ok;

/**
 * Every kind the registry holds, read through its generated schema; kept a minute, since a kind or
 * a field changes only with a deploy of the registry.
 */
export function catalog(edge: Edge): Promise<Read<Catalog>> {
	return kept(edge, 'control catalog', 60, () => catalogNow(edge), answered);
}

async function catalogNow(edge: Edge): Promise<Read<Catalog>> {
	const read = await registry<unknown>(edge, '/kinds');
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
	return plural.ok ? registry<List>(edge, `/${plural.data}`) : plural;
}

/** One resource of `kind`, by its id or its name. */
export async function resource(
	edge: Edge,
	kind: string,
	ref: string,
	catalogRead = catalog(edge),
): Promise<Read<Resource>> {
	const plural = await pluralOf(catalogRead, kind);
	return plural.ok ? registry<Resource>(edge, `/${plural.data}/${segment(ref)}`) : plural;
}

/** The registry's answer to a write as the console reports it. */
function writtenOf(read: Read<{ revision?: number; task?: string; id?: string }>): Written {
	if (!read.ok) return read;
	const { revision, task, id } = read.data;
	if (task === undefined) return { ok: true, unchanged: true };
	return { ok: true, task, revision: revision ?? 0, ...(id === undefined ? {} : { id }) };
}

const refused = (status: number, code: string, message: string): Written => ({
	ok: false,
	failure: { status, code, message },
});

/** A refusal where this console holds no token to write with, so nothing is asked first. */
const unwritable = (edge: Edge): Written | undefined =>
	edge.mock || edge.env.REGISTRY_TOKEN
		? undefined
		: refused(503, 'service_unavailable', 'This console does not write.');

/** `body` sent by `method` to `path` under the registry's `/v1`, with the Worker's token. */
async function write(
	edge: Edge,
	method: 'POST' | 'PUT' | 'PATCH',
	path: string,
	body: { by: string; revision: number; spec: Spec },
): Promise<Written> {
	const token = edge.env.REGISTRY_TOKEN;
	const asking = { method, body: JSON.stringify(body), token, timeout: WRITE_TIMEOUT };
	return writtenOf(await registry(edge, path, asking));
}

/**
 * A resource made at revision 0, as `by`: a named kind's by `PUT` at its name, a kind with no name
 * by `POST` to its collection, answered with the id the registry drew -- platform's RFC 32hd9.
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
