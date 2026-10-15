import { describe, expect, it } from 'vitest';
import { levelOf, titleOf } from './levels.ts';
import { learnApps } from './scope/scope.ts';
import { ID, PLACED } from './server/nodes.fixture.ts';
import { learnPlaces } from './map/places.ts';

// What control says of the nodes and the one app named below; see RFC 17b3o.
learnPlaces(PLACED);
learnApps({ relay: { display: 'Relay', repository: 'monoflake/platform' } });

const at = (href: string) => new URL(href, 'http://localhost');

describe('levelOf', () => {
	it('lists the view’s sections at its root, with no way up', () => {
		const level = levelOf({ url: at('/infra/nodes'), view: 'infra' });
		expect(level.items.map((one) => one.label)).toEqual([
			'Overview',
			'Nodes',
			'Deployments',
			'Apps',
			'Tasks',
			'Events',
			'Accounts',
		]);
		expect(level.current).toBe('/nodes');
		expect(level.up).toBeUndefined();
		expect(level.trail).toEqual([{ label: 'Nodes' }]);
	});

	it('leaves what is infra’s out of a view that does not show it, and keeps Tasks in every one', () => {
		const level = levelOf({ url: at('/services'), view: 'services' });
		expect(level.items.map((one) => one.key)).toEqual([
			'/',
			'/deployments',
			'/apps',
			'/tasks',
			'/events',
		]);
	});

	it('enters a node: its pages, the way back to Nodes, and its tab in the trail', () => {
		const level = levelOf({
			url: at(`/infra/nodes/${ID.tyo}?tab=disk&range=6h`),
			view: 'infra',
			node: ID.tyo,
		});
		expect(level.items.map((one) => one.key)).toEqual([
			'overview',
			'apps',
			'events',
			'disk',
			'spec',
			'drift',
		]);
		expect(level.current).toBe('disk');
		expect(level.up).toEqual({ label: 'Nodes', href: '/infra/nodes' });
		expect(level.items[1]?.href).toBe(`/infra/nodes/${ID.tyo}?tab=apps&range=6h`);
		expect(level.trail.map((one) => one.label)).toEqual(['Nodes', 'Tokyo, Japan', 'Disk']);
		// Tokyo holds three nodes, so its short id tells this one apart.
		expect(level.code).toBe('d132');
		expect(level.trail.at(-1)?.href).toBeUndefined();
	});

	it('enters an app, keeping its span across its pages', () => {
		const level = levelOf({
			url: at('/platform/apps/relay?range=7d'),
			view: 'platform',
			app: 'relay',
		});
		expect(level.current).toBe('overview');
		expect(level.items.map((one) => one.href)).toEqual([
			'/platform/apps/relay?range=7d',
			'/platform/apps/relay?tab=usage&range=7d',
			'/platform/apps/relay?tab=history&range=7d',
			'/platform/apps/relay?tab=spec&range=7d',
		]);
		expect(level.trail).toEqual([
			{ label: 'Apps', href: '/platform/apps' },
			{ label: 'Relay', code: 'relay' },
		]);
	});

	it('keeps a run in the level it was opened from', () => {
		const where = { url: at('/deployments/42'), view: 'all' as const, run: '42' };
		const level = levelOf(where);
		expect(level.up).toBeUndefined();
		expect(level.current).toBe('/deployments');
		expect(level.trail).toEqual([
			{ label: 'Deployments', href: '/deployments' },
			{ label: '#42', mono: true },
		]);
		expect(titleOf(level, where)).toBe('#42');
	});

	it('opens a node’s Drift, with the trail naming it', () => {
		const level = levelOf({ url: at('/nodes/tyo?tab=drift'), view: 'all', node: ID.tyo });
		expect(level.current).toBe('drift');
		expect(level.trail.at(-1)).toEqual({ label: 'Drift' });
	});

	it('enters an account by its id, called by its first eight digits, as it has no name', () => {
		const id = '1a2b3c4d5e6f7a8b';
		const where = {
			url: at(`/infra/accounts/${id}?tab=nodes`),
			view: 'infra' as const,
			account: id,
		};
		const level = levelOf(where);
		expect(level.depth).toBe(1);
		expect(level.items.map((one) => one.href)).toEqual([
			`/infra/accounts/${id}?`,
			`/infra/accounts/${id}?tab=nodes`,
		]);
		expect(level.current).toBe('nodes');
		expect(level.up).toEqual({ label: 'Accounts', href: '/infra/accounts' });
		expect(level.trail).toEqual([
			{ label: 'Accounts', href: '/infra/accounts' },
			{ label: '1a2b3c4d', mono: true, href: `/infra/accounts/${id}` },
			{ label: 'Nodes' },
		]);
		expect(level.section?.path).toBe('/accounts');
		expect(titleOf(level, where)).toBe('1a2b3c4d');
	});

	it('leaves its first page out of the trail', () => {
		const level = levelOf({
			url: at('/accounts/1a2b3c4d5e6f7a8b'),
			view: 'all',
			account: '1a2b3c4d5e6f7a8b',
		});
		expect(level.current).toBe('overview');
		expect(level.trail).toEqual([
			{ label: 'Accounts', href: '/accounts' },
			{ label: '1a2b3c4d', mono: true },
		]);
	});

	it('keeps a task in Tasks, named by its id beside its service', () => {
		const task = { service: 'registry', id: '0123456789abcdef' };
		const where = { url: at('/tasks/registry/0123456789abcdef'), view: 'all' as const, task };
		const level = levelOf(where);
		expect(level.depth).toBe(0);
		expect(level.current).toBe('/tasks');
		expect(level.trail).toEqual([
			{ label: 'Tasks', href: '/tasks' },
			{ label: '0123456789abcdef', code: 'registry', mono: true },
		]);
		expect(titleOf(level, where)).toBe('0123456789abcdef');
	});

	it('reaches a kind with no page under /kinds, in no section, and one of its resources', () => {
		const list = { url: at('/kinds/databases'), view: 'all' as const, kind: 'databases' };
		const level = levelOf(list);
		expect(level.current).toBeUndefined();
		expect(level.trail).toEqual([{ label: 'Databases' }]);
		expect(titleOf(level, list)).toBe('Databases');
		const one = { ...list, url: at('/platform/kinds/databases/main'), view: 'platform' as const };
		const opened = levelOf({ ...one, resource: 'main' });
		expect(opened.trail).toEqual([
			{ label: 'Databases', href: '/platform/kinds/databases' },
			{ label: 'main' },
		]);
		expect(titleOf(opened, { ...one, resource: 'main' })).toBe('main');
	});
});
