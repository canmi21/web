/**
 * The views the console is read in: All, with no segment of its own, and the three scopes that
 * narrow it, each its address's first segment; and which scope an app belongs to. See
 * spec/architecture/console.md.
 */

export const SCOPES = [
	{ key: 'infra', label: 'Infra' },
	{ key: 'platform', label: 'Platform' },
	{ key: 'services', label: 'Services' },
] as const;

export type Scope = (typeof SCOPES)[number]['key'];

/** Every scope at once, or one of them. */
export type View = 'all' | Scope;

export const VIEWS = [{ key: 'all', label: 'All' }, ...SCOPES] as const;

export const isScope = (param: string): param is Scope => SCOPES.some(({ key }) => key === param);

/** The view an address's optional first segment names: All where it names none. */
export const viewOf = (param: string | undefined): View =>
	param !== undefined && isScope(param) ? param : 'all';

export const labelOf = (view: View): string => VIEWS.find(({ key }) => key === view)?.label ?? view;

/** What the registry says of an app that the console reads: its display name and its repository. */
export interface AppFact {
	readonly display?: string;
	readonly repository?: string;
}

/**
 * Every app the registry holds, as it last said, each from its own `service.toml`; empty until it
 * has said anything, when every app is its code name and in Services. See RFC 17b3o.
 */
let apps: Readonly<Record<string, AppFact>> = {};

/** What the registry said of the apps, taken in, on the server and in the browser alike. */
export function learnApps(facts: Readonly<Record<string, AppFact>>): void {
	apps = facts;
}

/** The scope a repository's apps are in: infra's and the platform's by name, any other Services. */
const REPOSITORIES: Readonly<Record<string, Scope>> = {
	'monoflake/infra': 'infra',
	'monoflake/platform': 'platform',
};

/** An app's display name; one the registry has not named is written as its code name. */
export const displayOf = (app: string): string => apps[app]?.display ?? app;

/**
 * The display name and the code name in one string, where only text can be written -- an option,
 * a chart's names: `Relay (relay)`. Markup writes the code name small beside it instead, as
 * src/lib/apps/app-name.svelte does.
 */
export function appLabel(app: string): string {
	const name = displayOf(app);
	return name === app ? app : `${name} (${app})`;
}

/**
 * The layer whose repository declares `app`, as the registry says; an app it does not hold, or
 * holds with no repository, is a service.
 */
export function scopeOf(app: string): Scope {
	return REPOSITORIES[apps[app]?.repository ?? ''] ?? 'services';
}

/** Whether `view` shows `app`: All shows every one. */
export const shows = (view: View, app: string): boolean => view === 'all' || scopeOf(app) === view;

/** `path` read in `view`: `/nodes/tyo` in Infra is `/infra/nodes/tyo`, in All itself. */
export function within(view: View, path = '/'): string {
	if (view === 'all') return path;
	return path === '/' ? `/${view}` : `/${view}${path}`;
}

/** A node's page: in All from All, and in Infra, where the nodes are, from any scope. */
export const nodeHref = (view: View, code: string): string =>
	within(view === 'all' ? 'all' : 'infra', `/nodes/${code}`);

/** An app's page, in All from All and in the app's own scope from any scope. */
export const appHref = (view: View, app: string): string =>
	within(view === 'all' ? 'all' : scopeOf(app), `/apps/${encodeURIComponent(app)}`);
