import * as v from 'valibot';
import { describe, expect, it } from 'vitest';
import { Catalog, type Description } from '../control/catalog.gen.ts';
import type { Resource } from '../control/types.ts';
import { controlMock } from '../server/mock-control.ts';
import {
	accountPatch,
	candidatesFor,
	detachable,
	identitiesProblems,
	kindLabel,
	providerProblem,
	specOf,
	stepsOf,
} from './account.ts';

const body = (await (await controlMock('/registry/v1/kinds')).json()) as { data: unknown };
const catalog = v.parse(Catalog, body.data);
const kindOf = (name: string) => catalog.items.find((one) => one.name === name) as Description;
const ACCOUNT = kindOf('account');
const NODE = kindOf('node');
const KINDS = ['account_id', 'username', 'email'];

const node = (name: string, account?: string): Resource => ({
	kind: 'node',
	id: `${name}0000000000000`.slice(0, 16),
	name,
	revision: 1,
	spec: account === undefined ? {} : { account },
});

describe("an account's two steps", () => {
	it("are read off the catalog: its provider's choices, then its identities' kinds", () => {
		const steps = stepsOf(ACCOUNT);
		expect(steps?.provider.choices).toContain('oracle');
		expect(steps?.kind.choices).toEqual(KINDS);
		expect(steps?.value.masked).toBe(true);
		expect(stepsOf({ ...ACCOUNT, fields: [] })).toBeUndefined();
	});

	it('leave the first only with a provider the catalog lists', () => {
		const provider = stepsOf(ACCOUNT)?.provider;
		if (!provider) throw new Error('no provider');
		expect(providerProblem({ provider: '', values: {} }, provider)).toBe('Choose a provider.');
		expect(providerProblem({ provider: 'acme', values: {} }, provider)).toBeDefined();
		expect(providerProblem({ provider: 'oracle', values: {} }, provider)).toBeUndefined();
	});

	it('name each kind of identity as a person reads it', () => {
		expect(KINDS.map(kindLabel)).toEqual(['Account ID', 'Username', 'Email']);
	});

	it('send each kind filled, trimmed, an empty one left out, and at least one', () => {
		const draft = (values: Record<string, string>) => ({ provider: 'oracle', values });
		expect(identitiesProblems(draft({ account_id: ' ', username: '' }), KINDS)).toEqual([
			'Fill in at least one identity.',
		]);
		const good = draft({ account_id: '', username: ' canmi ', email: 'a@example.com' });
		expect(identitiesProblems(good, KINDS)).toEqual([]);
		expect(specOf(good, KINDS)).toEqual({
			provider: 'oracle',
			identities: [
				{ kind: 'username', value: 'canmi' },
				{ kind: 'email', value: 'a@example.com' },
			],
		});
	});
});

describe("an account's nodes", () => {
	const ID = 'aaaaaaaaaaaaaaaa';

	it('offer every node not under it, those under none first, one under another as a move', () => {
		const nodes = [node('tyo', 'bbbbbbbbbbbbbbbb'), node('sin'), node('rdu', ID), node('buf')];
		expect(candidatesFor(nodes, ID).map((one) => [one.node.name, one.moves])).toEqual([
			['buf', false],
			['sin', false],
			['tyo', true],
		]);
	});

	it('are attached and detached by a write of the node account alone, null taking it out', () => {
		expect(accountPatch(ID)).toEqual({ account: ID });
		expect(accountPatch(null)).toEqual({ account: null });
	});

	it('are detached only where the node kind lets a node go without an account', () => {
		expect(detachable(NODE)).toBe(true);
		const required = NODE.fields.map((one) =>
			one.name === 'account' ? { ...one, required: true } : one,
		);
		expect(detachable({ ...NODE, fields: required })).toBe(false);
	});
});
