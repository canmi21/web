import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
	appHref,
	appLabel,
	displayOf,
	isScope,
	learnApps,
	nodeHref,
	scopeOf,
	viewOf,
	within,
} from './scope.ts';

/** What the registry says of a few apps, as its import writes them from their declarations. */
const HELD = {
	host: { display: 'Host', repository: 'monoflake/infra' },
	relay: { display: 'Relay', repository: 'monoflake/platform' },
	console: { display: 'Console', repository: 'canmi21/web' },
};

beforeEach(() => learnApps(HELD));
afterEach(() => learnApps({}));

describe('scopeOf', () => {
	it("puts infra's apps in Infra, the platform's in Platform, and anything else in Services", () => {
		expect(['host', 'relay', 'console'].map(scopeOf)).toEqual(['infra', 'platform', 'services']);
	});

	it('puts every app in Services while the registry has said nothing', () => {
		learnApps({});
		expect(['host', 'relay'].map(scopeOf)).toEqual(['services', 'services']);
	});
});

describe('displayOf', () => {
	it('writes a name it lacks as the code name, and the code name beside one it has', () => {
		expect([displayOf('relay'), displayOf('my-app')]).toEqual(['Relay', 'my-app']);
		expect([appLabel('relay'), appLabel('my-app')]).toEqual(['Relay (relay)', 'my-app']);
	});

	it('writes every app as its code name while the registry has said nothing', () => {
		learnApps({});
		expect([displayOf('relay'), appLabel('relay')]).toEqual(['relay', 'relay']);
	});
});

describe('within', () => {
	it('puts a scope first, and All nowhere', () => {
		expect(within('infra', '/nodes/tyo')).toBe('/infra/nodes/tyo');
		expect([within('all'), within('all', '/apps/web')]).toEqual(['/', '/apps/web']);
		expect(within('services')).toBe('/services');
		expect(within('services', '/events?app=web')).toBe('/services/events?app=web');
	});

	it("stays in All from All, and leads to Infra's nodes and an app's own scope from a scope", () => {
		expect([nodeHref('all', 'tyo'), appHref('all', 'relay')]).toEqual([
			'/nodes/tyo',
			'/apps/relay',
		]);
		expect(nodeHref('services', 'tyo')).toBe('/infra/nodes/tyo');
		expect(['host', 'relay', 'my site'].map((app) => appHref('services', app))).toEqual([
			'/infra/apps/host',
			'/platform/apps/relay',
			'/services/apps/my%20site',
		]);
	});

	it('reads All where the address names no scope', () => {
		expect([viewOf(undefined), viewOf('infra'), viewOf('nodes')]).toEqual(['all', 'infra', 'all']);
	});

	it('knows the three scopes and nothing else', () => {
		expect(['infra', 'platform', 'services', 'nodes', ''].map(isScope)).toEqual([
			true,
			true,
			true,
			false,
			false,
		]);
	});
});
