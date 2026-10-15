/**
 * The facets of the control plane: the catalog, a kind's resources and one of them, a node's
 * drift, and the ledger's tasks and one task. Each answers the read whole, since a form or a
 * timeline draws all of it; spread into `FACETS`, ./facets.ts, and addressed as every facet is.
 */
import type { Catalog } from '../control/catalog.gen.ts';
import type { Drift, List, Resource, TaskDetail, TaskPage, TaskQuery } from '../control/types.ts';
import { resource, resources, task, tasks } from './control.ts';
import type { Facet } from './facets.ts';
import { type Read, node } from './read.ts';

const facet = <P extends Record<string, string>, R>(one: Facet<P, R>): Facet<P, R> => one;

/** `keys` of `query` that are there and not empty. */
function picked<K extends string>(query: Readonly<Record<string, string>>, keys: readonly K[]) {
	return Object.fromEntries(keys.filter((key) => query[key]).map((key) => [key, query[key]])) as {
		[key in K]?: string;
	};
}

const TASK_KEYS = ['service', 'state', 'kind', 'caller', 'parent', 'before', 'limit'] as const;

export const CONTROL_FACETS = {
	/** Every kind control holds, which every form and list of a kind is drawn from. */
	catalog: facet({
		revision: 1,
		params: () => ({}),
		read: (context): Promise<Read<Catalog>> => context.sources.catalog(),
	}),

	/** Every resource of a kind, by the catalog's name for it. */
	resources: facet({
		revision: 1,
		params: (query) => (query.kind ? { kind: query.kind } : undefined),
		read: ({ sources }, { kind }): Promise<Read<List>> =>
			resources(sources.edge, kind, sources.catalog()),
	}),

	/** One resource of a kind, by its id or its name. */
	resource: facet({
		revision: 1,
		params: (query) => (query.kind && query.ref ? { kind: query.kind, ref: query.ref } : undefined),
		read: ({ sources }, { kind, ref }): Promise<Read<Resource>> =>
			resource(sources.edge, kind, ref, sources.catalog()),
	}),

	/** What a node's host finds control wants there and it does not run, or the reverse. */
	drift: facet({
		revision: 1,
		params: (query) => (query.node ? { node: query.node } : undefined),
		read: ({ sources }, params): Promise<Read<Drift>> => node(sources.edge, params.node, '/drift'),
	}),

	/** A page of the ledger's tasks, newest first. */
	tasks: facet({
		revision: 1,
		params: (query): TaskQuery => picked(query, TASK_KEYS),
		read: ({ sources }, query): Promise<Read<TaskPage>> => tasks(sources.edge, query),
	}),

	/** One task, its events in order, and the tasks it started. */
	task: facet({
		revision: 1,
		params: (query) =>
			query.service && query.id ? { service: query.service, id: query.id } : undefined,
		read: ({ sources }, { service, id }): Promise<Read<TaskDetail>> =>
			task(sources.edge, service, id),
	}),
};
