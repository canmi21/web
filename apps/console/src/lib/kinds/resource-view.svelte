<script lang="ts">
	/**
	 * A resource as the registry holds it: what is wanted, by its kind's fields in the catalog's
	 * order, a masked value hidden until shown, then what is and what differs, as the platform wrote
	 * them. Drift is drawn here, never worked out -- platform's RFC cpc2b.
	 */
	import type { Description } from '../control/catalog.gen.ts';
	import type { Resource } from '../control/types.ts';
	import FieldValue from './field-value.svelte';
	import { shown } from './form.ts';

	let { description, resource }: { description: Description; resource: Resource } = $props();

	const facts = (record: Record<string, unknown> | undefined) => Object.entries(record ?? {});
	/** Keys the spec holds that the catalog does not describe, shown after the ones it does. */
	const rest = $derived(
		facts(resource.spec).filter(([key]) => !description.fields.some((one) => one.name === key)),
	);
</script>

<section aria-labelledby="resource-spec">
	<h3 id="resource-spec">Spec</h3>
	<dl>
		<dt>id</dt>
		<dd>{resource.id}</dd>
		<dt>revision</dt>
		<dd>{resource.revision}</dd>
		{#each description.fields as field (field.name)}
			<dt>{field.name}</dt>
			<dd><FieldValue {field} value={resource.spec[field.name]} /></dd>
		{/each}
		{#each rest as [key, value] (key)}
			<dt>{key}</dt>
			<dd>{shown(value)}</dd>
		{/each}
	</dl>
</section>

<section aria-labelledby="resource-status">
	<h3 id="resource-status">Status</h3>
	{#if resource.status && facts(resource.status).length}
		<dl>
			{#each facts(resource.status) as [key, value] (key)}
				<dt>{key}</dt>
				<dd>{shown(value)}</dd>
			{/each}
		</dl>
	{:else}
		<p>No controller has written one yet.</p>
	{/if}
</section>

<section aria-labelledby="resource-drift">
	<h3 id="resource-drift">Drift</h3>
	<p>{resource.drift === undefined || resource.drift === null ? 'None.' : shown(resource.drift)}</p>
</section>
