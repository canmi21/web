<script lang="ts">
	/**
	 * What a resource holds for one field, drawn as the catalog says: a secret by where it is kept, a
	 * masked value hidden until shown, a list of objects an item at a time by its own fields, a
	 * reference or a list of them by what each names is called, and anything else as one line of
	 * text.
	 */
	import type { Field } from '../control/catalog.gen.ts';
	import { holdsObjects } from '../control/catalog.ts';
	import Masked from '../ui/masked.svelte';
	import FieldValue from './field-value.svelte';
	import { type Options, said, shown } from './form.ts';

	let {
		field,
		value,
		label = field.name,
		options = {},
	}: {
		field: Field;
		value: unknown;
		/** What the value is called where a control names it: `identities 1 value`. */
		label?: string;
		/** The resources references name, to write a name for an id. */
		options?: Options;
	} = $props();

	const held = $derived(value !== undefined && value !== null && value !== '');
	const items = $derived(
		holdsObjects(field) && Array.isArray(value) ? (value as Record<string, unknown>[]) : undefined,
	);
</script>

{#if field.secret}
	kept by the secret service
{:else if items?.length}
	<ol>
		{#each items as item, index (index)}
			<li>
				<dl>
					{#each field.fields ?? [] as one (one.name)}
						<dt>{one.name}</dt>
						<dd>
							<FieldValue
								field={one}
								value={item[one.name]}
								label="{label} {index + 1} {one.name}"
							/>
						</dd>
					{/each}
				</dl>
			</li>
		{/each}
	</ol>
{:else if field.masked && held}
	<Masked value={shown(value)} {label} />
{:else}
	{said(field, value, options)}
{/if}
