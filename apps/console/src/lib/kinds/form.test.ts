import { describe, expect, it } from 'vitest';
import type { Field } from '../control/catalog.gen.ts';
import { patchOf } from '../control/patch.ts';
import { edited, filled, inputOf, read, referred, shown } from './form.ts';

/**
 * A list of objects holding a secret beside a field only the registry writes, the path any field
 * marked `secret` takes; and a node's fields as the committed catalog describes them.
 */
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
	{ name: 'account', type: 'reference', kind: 'account', editable: true, required: true },
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
		expect(referred(NODE)).toEqual(['account']);
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
		expect(reading.missing).toEqual(['spec.account']);
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
		const node = { address: 'a', tier: 'home', account: 'd', core: true };
		expect(
			patchOf(node, edited(node, { address: 'a', tier: 'home', account: 'd', core: true }, NODE)),
		).toEqual({});
		expect(patchOf(node, edited(node, { address: 'a', tier: 'home', account: 'd' }, NODE))).toEqual(
			{
				core: null,
			},
		);
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

describe('a masked field', () => {
	const MASKED: Field = {
		name: 'value',
		type: 'string',
		masked: true,
		editable: true,
		required: true,
	};
	const MASKED_ITEMS: Field = {
		name: 'identities',
		type: 'list',
		editable: true,
		required: true,
		fields: [
			{
				name: 'kind',
				type: 'choice',
				choices: ['tenancy', 'email'],
				editable: true,
				required: true,
			},
			MASKED,
		],
	};

	it('is a text input hidden until shown, filled with what is held, unlike a secret', () => {
		expect(inputOf(MASKED)).toBe('masked');
		expect(filled(MASKED, 'ocid1.tenancy')).toBe('ocid1.tenancy');
		expect(inputOf({ ...MASKED, type: 'integer' })).toBe('number');
		expect(inputOf({ ...MASKED, secret: true })).toBe('password');
	});

	it('is read and sent like any text, and asked for again where required and left blank', () => {
		const sent = form([
			['spec.identities.0.kind', 'tenancy'],
			['spec.identities.0.value', ' ocid1.tenancy '],
			['spec.identities.1.kind', 'email'],
			['spec.identities.1.value', ''],
		]);
		const reading = read([MASKED_ITEMS], sent, 'spec', false);
		expect(reading.spec).toEqual({
			identities: [{ kind: 'tenancy', value: 'ocid1.tenancy' }, { kind: 'email' }],
		});
		expect(reading.missing).toEqual(['spec.identities.1.value']);
	});

	it('changes by what was typed, the list written whole', () => {
		const before = { identities: [{ kind: 'tenancy', value: 'old' }] };
		const after = edited(before, { identities: [{ kind: 'tenancy', value: 'new' }] }, [
			MASKED_ITEMS,
		]);
		expect(patchOf(before, after)).toEqual({ identities: [{ kind: 'tenancy', value: 'new' }] });
	});
});
