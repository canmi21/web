import { describe, expect, it } from 'vitest';
import type { Field } from '../control/catalog.gen.ts';
import { patchOf } from '../control/patch.ts';
import { edited, filled, inputOf, read, referred, shown } from './form.ts';

/** An account's and a node's fields as the committed catalog describes them. */
const VALUE: Field = {
	name: 'value',
	type: 'string',
	secret: true,
	editable: true,
	required: false,
};
const IDENTITIES: Field = {
	name: 'identities',
	type: 'list',
	editable: true,
	required: true,
	fields: [
		{
			name: 'kind',
			type: 'choice',
			choices: ['user_id', 'tenancy', 'email'],
			editable: true,
			required: true,
		},
		VALUE,
		{ name: 'secret', type: 'string', editable: false, required: false },
	],
};
const ACCOUNT: Field[] = [
	{ name: 'provider', type: 'string', editable: true, required: true },
	IDENTITIES,
];
const NODE: Field[] = [
	{ name: 'address', type: 'string', editable: true, required: true },
	{ name: 'tier', type: 'choice', choices: ['datacenter', 'home'], editable: true, required: true },
	{ name: 'domain', type: 'reference', kind: 'domain', editable: true, required: true },
	{ name: 'core', type: 'boolean', editable: true, required: false },
	{ name: 'expiry', type: 'integer', editable: true, required: false },
	{ name: 'roles', type: 'list', choices: ['compute', 'core'], editable: true, required: false },
	{ name: 'release', type: 'object', editable: true, required: false },
];

const form = (entries: [string, string][]) => {
	const data = new FormData();
	for (const [key, value] of entries) data.append(key, value);
	return data;
};

describe('inputOf', () => {
	it('draws each field from its type, a secret as a password and the registry’s own as shown', () => {
		expect(NODE.map(inputOf)).toEqual([
			'text',
			'select',
			'reference',
			'checkbox',
			'number',
			'checkboxes',
			'json',
		]);
		expect(IDENTITIES.fields?.map(inputOf)).toEqual(['select', 'password', 'shown']);
		expect(inputOf(IDENTITIES)).toBe('items');
	});

	it('names every kind a form refers to, an item’s fields included', () => {
		expect(referred(NODE)).toEqual(['domain']);
	});
});

describe('read', () => {
	it('reads each field, leaves a blank one out, and names the required ones left blank', () => {
		const sent = form([
			['spec.address', ' 10.0.0.1 '],
			['spec.tier', 'home'],
			['spec.core', 'on'],
			['spec.expiry', '12'],
			['spec.roles', 'compute'],
			['spec.roles', 'nonsense'],
			['spec.release', '{"run": 4}'],
		]);
		const reading = read(NODE, sent, 'spec', true);
		expect(reading.spec).toEqual({
			address: '10.0.0.1',
			tier: 'home',
			core: true,
			expiry: 12,
			roles: ['compute'],
			release: { run: 4 },
		});
		expect(reading.missing).toEqual(['spec.domain']);
		expect(reading.invalid).toEqual([]);
	});

	it('refuses a number, a choice or JSON it cannot read, once each', () => {
		const sent = form([
			['spec.tier', 'moon'],
			['spec.expiry', '1.5'],
			['spec.release', '{'],
		]);
		expect(read(NODE, sent, 'spec', false).invalid).toEqual([
			'spec.tier',
			'spec.expiry',
			'spec.release',
		]);
	});

	it('reads a list of objects item by item, and never asks a secret again when editing', () => {
		const sent = form([
			['spec.provider', 'oracle'],
			['spec.identities.0.kind', 'tenancy'],
			['spec.identities.0.value', ''],
			['spec.identities.2.kind', 'email'],
			['spec.identities.2.value', 'a@b.c'],
		]);
		const reading = read(ACCOUNT, sent, 'spec', false);
		expect(reading.spec).toEqual({
			provider: 'oracle',
			identities: [{ kind: 'tenancy' }, { kind: 'email', value: 'a@b.c' }],
		});
		expect(reading.missing).toEqual([]);
	});
});

describe('edited', () => {
	const before = {
		provider: 'oracle',
		identities: [
			{ kind: 'tenancy', secret: 'accounts/registry/ACCOUNT_1_TENANCY' },
			{ kind: 'email', secret: 'accounts/registry/ACCOUNT_1_EMAIL' },
		],
		unknown: 'kept',
	};

	it('keeps an item’s held secret where none was typed, and sends a typed one alone', () => {
		const sent = {
			provider: 'oracle',
			identities: [{ kind: 'tenancy' }, { kind: 'email', value: 'x' }],
		};
		const after = edited(before, sent, ACCOUNT);
		expect(after.identities).toEqual([
			{ kind: 'tenancy', secret: 'accounts/registry/ACCOUNT_1_TENANCY' },
			{ kind: 'email', value: 'x' },
		]);
		expect(after.unknown).toBe('kept');
		expect(patchOf(before, after)).toEqual({ identities: after.identities });
	});

	it('changes nothing where nothing was changed, and takes out a field left blank', () => {
		const node = { address: 'a', tier: 'home', domain: 'd', core: true };
		expect(
			patchOf(node, edited(node, { address: 'a', tier: 'home', domain: 'd', core: true }, NODE)),
		).toEqual({});
		expect(patchOf(node, edited(node, { address: 'a', tier: 'home', domain: 'd' }, NODE))).toEqual({
			core: null,
		});
	});
});

describe('shown and filled', () => {
	it('never fills a secret back in, and writes a list or an object as one line', () => {
		expect(filled(VALUE, 'leaked')).toBe('');
		expect(shown(['compute', 'core'])).toBe('compute, core');
		expect(shown({ run: 4 })).toBe('{"run":4}');
		expect(shown(undefined)).toBe('–');
	});
});
