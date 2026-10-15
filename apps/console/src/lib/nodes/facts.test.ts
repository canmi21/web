import { afterEach, describe, expect, it } from 'vitest';
import { ID, PLACED } from '../server/nodes.fixture.ts';
import { FACTS, PROVIDERS, learnFacts, providerName } from './facts.ts';

describe('failure domains', () => {
	it('are provider codes, each one the copy of the registry names', () => {
		expect(Object.values(FACTS).map((facts) => facts.domain)).toEqual([
			'oci',
			'oci',
			'oci',
			'oci-2',
			'az',
			'az',
			'rkn',
			'int',
			'int',
		]);
		for (const { domain } of Object.values(FACTS))
			expect(PROVIDERS[domain.replace(/-\d+$/, '')]).toBeDefined();
		expect(Object.keys(PROVIDERS)).toEqual(['oci', 'az', 'rkn', 'int', 'cf', 'vcl']);
	});

	it('are read by the provider name, a second account numbered, an unknown code as written', () => {
		expect(['oci', 'az', 'rkn', 'int', 'cf', 'vcl'].map(providerName)).toEqual([
			'Oracle',
			'Azure',
			'RackNerd',
			'Self-hosted',
			'Cloudflare',
			'Vercel',
		]);
		expect(providerName('oci-2')).toBe('Oracle 2');
		expect(providerName('xyz')).toBe('xyz');
		expect(providerName('xyz-2')).toBe('xyz-2');
		expect(providerName('racknerd')).toBe('racknerd');
	});
});

describe('learnFacts', () => {
	afterEach(() => learnFacts({}));

	it('knows each node by its domain alone before control has said anything', () => {
		learnFacts({});
		expect(FACTS[ID.tyo]).toEqual({ domain: 'oci' });
		expect(FACTS[ID.tyo].tier).toBeUndefined();
		expect(FACTS[ID.tyo].system).toBeUndefined();
		expect(FACTS[ID.tyo].expiry).toBeUndefined();
	});

	it('takes in the tier, system and expiry control says, keeping the domain', () => {
		learnFacts(PLACED);
		expect(FACTS[ID.nrt]).toEqual({
			tier: 'datacenter',
			domain: 'oci',
			expiry: 2036,
			system: 'alpine',
		});
		expect(FACTS[ID.rdu]).toEqual({ tier: 'home', domain: 'int', system: 'debian' });
		learnFacts({ ...PLACED, [ID.nrt]: { core: false } });
		expect(FACTS[ID.nrt]).toEqual({ domain: 'oci' });
	});
});
