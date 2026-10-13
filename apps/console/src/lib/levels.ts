/**
 * Where the reader is in the console, as a level of one tree: a view at the root, and a node, an
 * app or an account inside it. A level carries the pages the sidebar lists, the way back
 * up, and the trail the top bar writes, so the shell is drawn from one answer. A record with a page
 * and nothing under it -- a run, a task, a resource of a kind under `/kinds` -- is no level, and
 * keeps the level it was opened from. See spec/console/navigation.md.
 */
import type { IconComponent } from '@canmi/design/components/icon';
import ActivityIcon from '@tabler/icons-svelte-runes/icons/activity';
import ChartLineIcon from '@tabler/icons-svelte-runes/icons/chart-line';
import DatabaseIcon from '@tabler/icons-svelte-runes/icons/database';
import FileCodeIcon from '@tabler/icons-svelte-runes/icons/file-code';
import GitCompareIcon from '@tabler/icons-svelte-runes/icons/git-compare';
import HistoryIcon from '@tabler/icons-svelte-runes/icons/history';
import LayoutDashboardIcon from '@tabler/icons-svelte-runes/icons/layout-dashboard';
import PackagesIcon from '@tabler/icons-svelte-runes/icons/packages';
import ServerIcon from '@tabler/icons-svelte-runes/icons/server-2';
import { TABS as APP_TABS, appQuery, appViewOf } from './apps/view.ts';
import {
	TABS as RECORD_TABS,
	pluralLabel,
	recordQuery,
	recordViewOf,
	shortId,
} from './kinds/view.ts';
import { nameOf } from './map/places.ts';
import { TABS as NODE_TABS, hrefOf as nodeQuery, viewOf as nodeViewOf } from './nodes/view.ts';
import { type View, appHref, displayOf, nodeHref, within } from './scope/scope.ts';
import { type Section, sectionOf, sectionsIn } from './sections.ts';

/** One of the pages a level lists. */
export interface Item {
	readonly key: string;
	readonly label: string;
	readonly icon: IconComponent;
	readonly href: string;
}

/** A step of the top bar's trail; the last is the page itself and links nowhere. */
export interface Crumb {
	readonly label: string;
	/** The key beside a display name, as a node's city takes its code. */
	readonly code?: string;
	readonly href?: string;
	/** Written in the mono face, as a run's number is. */
	readonly mono?: boolean;
}

export interface Level {
	/** How deep in the tree: a view's root is 0, a thing inside it 1. */
	readonly depth: number;
	/** The level's name, at the head of its pages; absent at a view's root. */
	readonly name?: string;
	readonly code?: string;
	readonly items: readonly Item[];
	/** The item open, by its key. */
	readonly current?: string;
	/** The level above, which the sidebar's way back names. */
	readonly up?: { readonly label: string; readonly href: string };
	readonly trail: readonly Crumb[];
	/** The root's section the level sits under, which the switcher keeps across views. */
	readonly section?: Section;
}

const NODE_ICONS: Record<(typeof NODE_TABS)[number]['key'], Item['icon']> = {
	overview: LayoutDashboardIcon,
	apps: PackagesIcon,
	events: ActivityIcon,
	disk: DatabaseIcon,
	spec: FileCodeIcon,
	drift: GitCompareIcon,
};

const APP_ICONS: Record<(typeof APP_TABS)[number]['key'], Item['icon']> = {
	overview: LayoutDashboardIcon,
	usage: ChartLineIcon,
	history: HistoryIcon,
	spec: FileCodeIcon,
};

const RECORD_ICONS: Record<(typeof RECORD_TABS)[number]['key'], Item['icon']> = {
	overview: LayoutDashboardIcon,
	nodes: ServerIcon,
};

/** What a query is read with: `page.url`'s is read-only, a server's is not. */
type Query = Pick<URLSearchParams, 'get'>;

/** What a level is worked out from: the address and the route's parameters. */
export interface Where {
	readonly url: { readonly pathname: string; readonly searchParams: Query };
	readonly view: View;
	readonly node?: string;
	readonly app?: string;
	readonly run?: string;
	/** An account's id, since it has no name -- platform's RFC 32hd9. */
	readonly account?: string;
	/** A task of the ledger, which its service and its id name together. */
	readonly task?: { readonly service: string; readonly id: string };
	/** A kind with no page of its own, by its plural, and one of its resources. */
	readonly kind?: string;
	readonly resource?: string;
}

/** The trail's step for the open item of an object's level, unless it is the first. */
function opened(items: readonly Item[], current: string, href: string, name: Crumb): Crumb[] {
	const first = items[0]?.key;
	const item = items.find((one) => one.key === current);
	if (current === first || !item) return [name];
	return [{ ...name, href }, { label: item.label }];
}

/**
 * An account's level, under the root's section that lists them: addressed by its id, and called by
 * its id's first eight digits, as it has no name. Platform's RFC 32hd9.
 */
function accountLevel(url: Where['url'], view: View, id: string): Level {
	const path = '/accounts';
	const name = shortId(id);
	const query = recordViewOf(url.searchParams);
	const base = within(view, `${path}/${encodeURIComponent(id)}`);
	const section = sectionOf(path);
	const label = section?.label ?? path;
	const items = RECORD_TABS.map((tab) => ({
		key: tab.key,
		label: tab.label,
		icon: RECORD_ICONS[tab.key],
		href: `${base}${recordQuery({ tab: tab.key })}`,
	}));
	return {
		depth: 1,
		name,
		items,
		current: query.tab,
		up: { label, href: within(view, path) },
		trail: [
			{ label, href: within(view, path) },
			...opened(items, query.tab, base, { label: name, mono: true }),
		],
		section,
	};
}

export function levelOf(where: Where): Level {
	const { url, view, node, app, account } = where;
	if (node !== undefined) {
		const query = nodeViewOf(url.searchParams);
		const base = nodeHref(view, node);
		const nodes = sectionOf('/nodes');
		const items = NODE_TABS.map((tab) => ({
			key: tab.key,
			label: tab.label,
			icon: NODE_ICONS[tab.key],
			href: `${base}${nodeQuery({ ...query, tab: tab.key, before: undefined })}`,
		}));
		const name = nameOf(node).full;
		return {
			depth: 1,
			name,
			code: node,
			items,
			current: query.tab,
			up: { label: 'Nodes', href: within(view, '/nodes') },
			trail: [
				{ label: 'Nodes', href: within(view, '/nodes') },
				...opened(items, query.tab, base, { label: name, code: node }),
			],
			section: nodes,
		};
	}
	if (app !== undefined) {
		const query = appViewOf(url.searchParams);
		const base = appHref(view, app);
		const items = APP_TABS.map((tab) => ({
			key: tab.key,
			label: tab.label,
			icon: APP_ICONS[tab.key],
			href: `${base}${appQuery({ ...query, tab: tab.key })}`,
		}));
		const name = displayOf(app);
		const code = name === app ? undefined : app;
		return {
			depth: 1,
			name,
			code,
			items,
			current: query.tab,
			up: { label: 'Apps', href: within(view, '/apps') },
			trail: [
				{ label: 'Apps', href: within(view, '/apps') },
				...opened(items, query.tab, base, { label: name, code }),
			],
			section: sectionOf('/apps'),
		};
	}
	if (account !== undefined) return accountLevel(url, view, account);
	const shown = sectionsIn(view);
	const found = sectionOf(url.pathname);
	// None for a section the view does not show, as Nodes in Services, whose page is a 404.
	const section = found && shown.includes(found) ? found : undefined;
	const items = shown.map((one) => ({
		key: one.path,
		label: one.label,
		icon: one.icon,
		href: within(view, one.path),
	}));
	return { depth: 0, items, current: section?.path, trail: rootTrail(where, section), section };
}

/** The trail at a view's root: its section, then the record opened from it, if one is. */
function rootTrail({ view, run, task, kind, resource }: Where, section?: Section): Crumb[] {
	if (kind !== undefined) {
		const label = pluralLabel(kind);
		if (resource === undefined) return [{ label }];
		return [
			{ label, href: within(view, `/kinds/${encodeURIComponent(kind)}`) },
			{ label: resource },
		];
	}
	if (section === undefined) return [];
	const record: Crumb | undefined =
		run !== undefined
			? { label: `#${run}`, mono: true }
			: task !== undefined
				? { label: task.id, code: task.service, mono: true }
				: undefined;
	if (record === undefined) return [{ label: section.label }];
	return [{ label: section.label, href: within(view, section.path) }, record];
}

/** The `<title>`: the one name the page is about. See spec/architecture/console.md. */
export function titleOf(level: Level, where: Where): string {
	const { node, app, run, account, task, kind, resource } = where;
	if (run !== undefined) return `#${run}`;
	if (kind !== undefined) return resource ?? pluralLabel(kind);
	if (account !== undefined) return shortId(account);
	return node ?? app ?? task?.id ?? level.section?.label ?? 'Console';
}
