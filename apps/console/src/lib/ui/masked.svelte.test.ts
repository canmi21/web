import { render } from 'svelte/server';
import { describe, expect, it } from 'vitest';
import MaskedInput from './masked-input.svelte';
import Masked, { DOTS } from './masked.svelte';

describe('a masked value on the server', () => {
	it('is drawn as dots, the value nowhere in what is drawn, with a control that shows it', () => {
		const { body } = render(Masked, {
			props: { value: 'ocid1.account.secretish', label: 'value' },
		});
		expect(body).toContain(DOTS);
		expect(body).not.toContain('ocid1.account.secretish');
		expect(body).toMatch(/aria-label="Show value"|>Show value</);
		expect(body).toContain('aria-pressed="false"');
	});

	it('is the value once shown, and the control then hides it', () => {
		const { body } = render(Masked, { props: { value: 'abc', label: 'value', shown: true } });
		expect(body).toContain('abc');
		expect(body).not.toContain(DOTS);
		expect(body).toMatch(/Hide value/);
		expect(body).toContain('aria-pressed="true"');
	});

	it('hides nothing of its length: every value is the same dots', () => {
		const short = render(Masked, { props: { value: 'a', label: 'v' } }).body;
		const long = render(Masked, { props: { value: 'a'.repeat(64), label: 'v' } }).body;
		expect(short).toBe(long);
	});
});

describe('a masked input on the server', () => {
	const props = { id: 'field-value', name: 'spec.value', value: 'held', label: 'value' };

	it('is filled with what is held, hidden, and kept out of the password manager', () => {
		const { body } = render(MaskedInput, { props });
		expect(body).toMatch(/<input[^>]*type="password"/);
		expect(body).toMatch(/<input[^>]*value="held"/);
		expect(body).toMatch(/<input[^>]*autocomplete="off"/);
		expect(body).toContain('aria-controls="field-value"');
		// Not a secret's input, which the form clears once sent.
		expect(body).not.toContain('data-secret');
	});

	it('is plain text once shown', () => {
		const { body } = render(MaskedInput, { props: { ...props, shown: true } });
		expect(body).toMatch(/<input[^>]*type="text"/);
	});
});
