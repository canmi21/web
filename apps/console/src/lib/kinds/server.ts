/**
 * What the pages over the registry read on the server: a kind's description from the catalog, its
 * resources or one of them, and the resources its references may name, the catalog read once a
 * load. Writes are the browser's, src/lib/control/write.ts. Platform's RFC cpc2b.
 */
import type { Catalog, Description } from '../control/catalog.gen.ts';
import { describe } from '../control/catalog.ts';
import type { Control } from '../control/types.ts';
import { catalog, resource, resources } from '../server/control.ts';
import type { Edge, Read } from '../server/read.ts';
import { type Options, referred } from './form.ts';

/** The kind named `name` or reached at `/v1/<name>`, or why there is none. */
export function describedIn(read: Read<Catalog>, name: string): Control<Description> {
	if (!read.ok) return read;
	const found = describe(read.data, name);
	if (found) return { ok: true, data: found };
	return { ok: false, failure: { status: 404, code: 'no_such_kind', message: `No kind ${name}.` } };
}

/** The catalog as one load reads it, handed to every read after so it is asked once. */
type Catalogued = Promise<Read<Catalog>>;

export const describeKind = async (
	edge: Edge,
	name: string,
	read: Catalogued = catalog(edge),
): Promise<Control<Description>> => describedIn(await read, name);

/** The resources of each kind `description` refers to, by id and name; one not read offers none. */
async function optionsOf(edge: Edge, description: Description, read: Catalogued): Promise<Options> {
	const kinds = referred(description.fields);
	const lists = await Promise.all(kinds.map((kind) => resources(edge, kind, read)));
	return Object.fromEntries(
		kinds.map((kind, index) => {
			const listed = lists[index];
			const items = listed?.ok ? listed.data.items : [];
			return [kind, items.map((one) => ({ value: one.id, label: one.name }))];
		}),
	);
}

/** A kind's page: its description, every resource of it, and what its references may name. */
export async function kindRead(edge: Edge, name: string, read: Catalogued = catalog(edge)) {
	const kind = await describeKind(edge, name, read);
	if (!kind.ok) return { description: kind, list: kind, options: {} };
	const [list, options] = await Promise.all([
		resources(edge, kind.data.name, read),
		optionsOf(edge, kind.data, read),
	]);
	return { description: kind, list, options };
}

/** One resource's page: its kind's description, the resource, and what its references may name. */
export async function resourceRead(
	edge: Edge,
	name: string,
	ref: string,
	read: Catalogued = catalog(edge),
) {
	const kind = await describeKind(edge, name, read);
	if (!kind.ok) return { description: kind, resource: kind, options: {} };
	const [held, options] = await Promise.all([
		resource(edge, kind.data.name, ref, read),
		optionsOf(edge, kind.data, read),
	]);
	return { description: kind, resource: held, options };
}

/**
 * The nodes under an account or in a domain: those whose `field` names its id. The list is the
 * node kind's own, so its columns are the catalog's for a node.
 */
export async function nodesUnder(edge: Edge, field: 'account' | 'domain', ref: string) {
	const read = catalog(edge);
	const [nodeKind, held, nodes] = await Promise.all([
		describeKind(edge, 'node', read),
		resource(edge, field, ref, read),
		resources(edge, 'node', read),
	]);
	if (!held.ok) return { description: nodeKind, list: held, options: {} };
	const options = nodeKind.ok ? await optionsOf(edge, nodeKind.data, read) : {};
	if (!nodes.ok) return { description: nodeKind, list: nodes, options };
	const items = nodes.data.items.filter((one) => one.spec[field] === held.data.id);
	return {
		description: nodeKind,
		list: { ok: true as const, data: { ...nodes.data, items } },
		options,
	};
}
