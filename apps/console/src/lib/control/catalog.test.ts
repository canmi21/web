import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import * as v from 'valibot';
import { describe, expect, it } from 'vitest';
import { controlMock } from '../server/mock-control.ts';
import { Catalog, type Field } from './catalog.gen.ts';
import { describe as kindOf, holdsObjects, identifying, withoutSecrets } from './catalog.ts';

/**
 * The examples the registry's own tests run, beside its schema in the platform's checkout: every
 * reader accepts each valid one and refuses each invalid one, as the producer does. RFC bq3vn.
 */
const EXAMPLES = fileURLToPath(
	new URL('../../../../../../platform/apps/data/registry/examples/catalog/', import.meta.url),
);
const cloned = existsSync(EXAMPLES);

const examples = (which: 'valid' | 'invalid') =>
	cloned
		? readdirSync(`${EXAMPLES}${which}`)
				.filter((name) => name.endsWith('.json'))
				.map((name) => [name, JSON.parse(readFileSync(`${EXAMPLES}${which}/${name}`, 'utf8'))])
		: [];

describe.skipIf(!cloned)("the registry's shared catalog examples", () => {
	it('are there, both kinds', () => {
		expect(examples('valid').length).toBeGreaterThan(0);
		expect(examples('invalid').length).toBeGreaterThan(0);
	});

	it.each(examples('valid'))('accepts %s', (_, example) => {
		const parsed = v.safeParse(Catalog, example);
		expect(parsed.issues?.map((issue) => v.getDotPath(issue))).toBeUndefined();
	});

	it.each(examples('invalid'))('refuses %s', (_, example) => {
		expect(v.safeParse(Catalog, example).success).toBe(false);
	});
});

if (!cloned) console.warn(`${EXAMPLES} is not cloned beside web; the shared examples are not run`);

/** The mock's catalog, which draws development's pages and has to read as the registry's does. */
async function mocked(): Promise<Catalog> {
	const body = (await (await controlMock('/registry/v1/kinds')).json()) as { data: unknown };
	return v.parse(Catalog, body.data);
}

describe('the catalog, as a page reads it', () => {
	it("is the mock's, read through the generated schema", async () => {
		const catalog = await mocked();
		expect(catalog.items.map((one) => one.name)).toEqual(['node', 'app', 'account', 'domain']);
	});

	it('finds a kind by its name or its route', async () => {
		const catalog = await mocked();
		expect(kindOf(catalog, 'account')?.plural).toBe('accounts');
		expect(kindOf(catalog, 'accounts')?.name).toBe('account');
		expect(kindOf(catalog, 'nothing')).toBeUndefined();
	});

	it("names a list of objects' item by its first required choice", async () => {
		const identities = kindOf(await mocked(), 'account')?.fields.find(
			(one) => one.name === 'identities',
		) as Field;
		expect(holdsObjects(identities)).toBe(true);
		expect(identifying(identities)?.name).toBe('kind');
		const roles = kindOf(await mocked(), 'node')?.fields.find((one) => one.name === 'roles');
		expect(roles && holdsObjects(roles)).toBe(false);
	});

	it("takes every secret's value out of a spec, at any depth, and keeps the rest", async () => {
		const fields = kindOf(await mocked(), 'account')?.fields ?? [];
		const spec = {
			provider: 'oracle',
			identities: [
				{ kind: 'email', value: 'hidden' },
				{ kind: 'tenancy', secret: 'accounts/registry/ACCOUNT_X_TENANCY' },
			],
		};
		expect(withoutSecrets(fields, spec)).toEqual({
			provider: 'oracle',
			identities: [
				{ kind: 'email' },
				{ kind: 'tenancy', secret: 'accounts/registry/ACCOUNT_X_TENANCY' },
			],
		});
		expect(JSON.stringify(withoutSecrets(fields, spec))).not.toContain('hidden');
	});
});
