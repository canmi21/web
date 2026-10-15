<script lang="ts">
	/**
	 * One resource as the catalog draws it: what control holds of it, and a form changing it
	 * at the revision it was read at. A node's and an app's Spec, an account's Overview, and a
	 * resource under `/kinds` stand on it. See spec/console/navigation.md.
	 */
	import Card from '../card.svelte';
	import type { Description } from '../control/catalog.gen.ts';
	import type { Control, Resource } from '../control/types.ts';
	import Skeleton from '../ui/skeleton.svelte';
	import Failed from './failed.svelte';
	import type { Options } from './form.ts';
	import ResourceForm from './resource-form.svelte';
	import ResourceView from './resource-view.svelte';

	let {
		read,
	}: {
		read: Read | Promise<Read>;
	} = $props();

	type Read = { description: Control<Description>; resource: Control<Resource>; options: Options };
</script>

{#await read}
	<Card title="Spec"><Skeleton height={320} /></Card>
{:then { description, resource, options }}
	{#if !description.ok}
		<Failed what="The catalog" failure={description.failure} />
	{:else if !resource.ok}
		<Failed what="The {description.data.name}" failure={resource.failure} />
	{:else}
		<Card title="Held">
			<ResourceView description={description.data} resource={resource.data} {options} />
		</Card>
		<Card title="Change">
			<ResourceForm description={description.data} resource={resource.data} {options} />
		</Card>
	{/if}
{/await}
