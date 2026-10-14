import * as v from 'valibot';
import { render } from 'svelte/server';
import { describe, expect, it } from 'vitest';
import { Catalog, type Description } from '../control/catalog.gen.ts';
import { controlMock } from '../server/mock-control.ts';
import AccountCreate from './account-create.svelte';

const body = (await (await controlMock('/registry/v1/kinds')).json()) as { data: unknown };
const ACCOUNT = v
	.parse(Catalog, body.data)
	.items.find((one) => one.name === 'account') as Description;

describe('making an account, on the server', () => {
	it('opens on its provider, every choice the catalog lists, the first of two steps', () => {
		const { body: html } = render(AccountCreate, { props: { description: ACCOUNT } });
		expect(html).toMatch(/<li aria-current="step">provider<\/li>/);
		expect(html).toContain('<option value="cloudflare">');
		expect(html).toContain('Next');
		expect(html).not.toContain('identity');
	});

	it('draws the second step from what was kept: the provider said, one masked input a kind', () => {
		const draft = { provider: 'oracle', values: { account_id: 'ocid1.tenancy', email: '' } };
		const { body: html } = render(AccountCreate, {
			props: { description: ACCOUNT, start: { step: 2, draft } },
		});
		expect(html).toMatch(/<li aria-current="step">identities<\/li>/);
		expect(html).toContain('provider: oracle');
		expect(html.match(/type="password"/g)).toHaveLength(3);
		for (const label of ['Account ID', 'Username', 'Email']) expect(html).toContain(label);
		expect(html).toMatch(/<input[^>]*value="ocid1.tenancy"/);
		expect(html).toContain('Back');
		expect(html).toContain('Create account');
	});
});
