/**
 * Which page of an account's or a domain's level is open, as its query says it -- as a node's are,
 * src/lib/nodes/view.ts -- and where a kind under `/kinds/<plural>` is named and sent. See
 * spec/console/navigation.md.
 */
import { type View, within } from '../scope/scope.ts';

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
	domain: '/domains',
};

/**
 * Where a kind with pages of its own is read in `view`, or one resource of it, its Spec where it
 * has one: an app in the view asked, whose page sends it on to its own; the rest are infra's.
 */
export function pagedHref(view: View, kind: string, name?: string): string | undefined {
	const path = PAGED[kind];
	if (path === undefined) return undefined;
	const where = kind === 'app' || view === 'all' ? view : 'infra';
	if (name === undefined) return within(where, path);
	const at = within(where, `${path}/${encodeURIComponent(name)}`);
	return kind === 'node' || kind === 'app' ? `${at}?tab=spec` : at;
}
