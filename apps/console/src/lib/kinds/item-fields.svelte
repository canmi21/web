<script lang="ts">
	/** The fields of one item of a list of objects, each drawn as a field of the form is. */
	import type { Field } from '../control/catalog.gen.ts';
	import FieldInput from './field-input.svelte';
	import type { Options } from './form.ts';

	let {
		fields,
		prefix,
		item,
		options,
		creating,
	}: {
		fields: readonly Field[];
		prefix: string;
		item: Record<string, unknown>;
		options: Options;
		creating: boolean;
	} = $props();
</script>

{#each fields as field (field.name)}
	<FieldInput {field} {prefix} value={item[field.name]} {options} {creating} />
{/each}
