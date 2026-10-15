/**
 * Which page of an account's level is open, as its query says it -- as a node's are,
 * src/lib/nodes/view.ts -- where a kind under `/kinds/<plural>` is named and sent, and how a
 * resource is called and addressed when its kind has no name. See spec/console/navigation.md.
 */
import type { Description } from '../control/catalog.gen.ts';
import type { Resource } from '../control/types.ts';
import { nodeLabel } from '../map/places.ts';
import { type View, within } from '../scope/scope.ts';
import { shown } from './form.ts';

export const TABS = [
	{ key: 'overview', label: 'Overview' },
	{ key: 'nodes', label: 'Nodes' },
] as const;

export type Tab = (typeof TABS)[number]['key'];

export interface RecordView {
	tab: Tab;
}

export function recordViewOf(query: Pick<URLSearchParams, 'get'>): RecordView {
	return { tab: TABS.find(({ key }) => key === query.get('tab'))?.key ?? 'overview' };
}

/** The query for `view`, writing only what differs from the defaults. */
export function recordQuery(view: RecordView): string {
	return view.tab === 'overview' ? '?' : `?tab=${view.tab}`;
}

/** A kind's collection as a page names it: `databases` is `Databases`. */
export const pluralLabel = (plural: string): string =>
	plural.charAt(0).toUpperCase() + plural.slice(1).replaceAll('_', ' ');

/** The kinds with pages of their own, where `/kinds/<plural>` sends a reader instead. */
export const PAGED: Readonly<Partial<Record<string, string>>> = {
	node: '/nodes',
	app: '/apps',
	account: '/accounts',
};

/**
 * Where a kind with pages of its own is read in `view`, or one resource of it by `ref`, its Spec
 * where it has one: an app in the view asked, whose page sends it on to its own; the rest are
 * infra's.
 */
export function pagedHref(view: View, kind: string, ref?: string): string | undefined {
	const path = PAGED[kind];
	if (path === undefined) return undefined;
	const where = kind === 'app' || view === 'all' ? view : 'infra';
	if (ref === undefined) return within(where, path);
	const at = within(where, `${path}/${encodeURIComponent(ref)}`);
	return kind === 'node' || kind === 'app' ? `${at}?tab=spec` : at;
}

/** How many of an id's digits stand for it where a resource has no name -- platform's RFC 32hd9. */
const SHORT = 8;

/** An id as it is shown where its resource has no name: its first eight digits. */
export const shortId = (id: string): string => id.slice(0, SHORT);

/**
 * What a resource is called: its name; a node by its city, as the console writes one everywhere;
 * or for any other kind with no name its first column -- an account's provider -- and its id's
 * first eight digits. Platform's RFC 32hd9.
 */
export function labelOf(
	description: Pick<Description, 'named' | 'columns'>,
	one: Resource,
): string {
	if (description.named && one.name) return one.name;
	if (one.kind === 'node') return nodeLabel(one.id);
	const first = description.columns[0];
	const said = first === undefined ? undefined : one.spec[first];
	const lead = said === undefined ? '' : `${shown(said)} `;
	return `${lead}${shortId(one.id)}`;
}

/** What a resource is addressed by in a link: its name, or its id where its kind has none. */
export const refOf = (description: Pick<Description, 'named'>, one: Resource): string =>
	description.named && one.name ? one.name : one.id;
