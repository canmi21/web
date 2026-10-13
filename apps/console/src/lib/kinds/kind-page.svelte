<script lang="ts">
	/**
	 * A kind's page as the catalog alone draws it: every resource of it, and a form creating one.
	 * Accounts and every kind under `/kinds` stand on it. See spec/console/navigation.md.
	 */
	import Card from '../card.svelte';
	import type { Description } from '../control/catalog.gen.ts';
	import type { Control, List } from '../control/types.ts';
	import Skeleton from '../ui/skeleton.svelte';
	import Failed from './failed.svelte';
	import type { Options } from './form.ts';
	import ResourceForm from './resource-form.svelte';
	import ResourceList from './resource-list.svelte';

	let {
		read,
		href,
		creates = true,
	}: {
		read: Read | Promise<Read>;
		/** Where a resource is read, by its name, or its id where its kind has none. */
		href: (ref: string) => string;
		/** Whether a form creating one follows the list, as it does on the kind's own page. */
		creates?: boolean;
	} = $props();

	type Read = { description: Control<Description>; list: Control<List>; options: Options };

	/** A table's header and eight 44 px rows, before the read says how many it holds. */
	const TABLE = 9 * 44;
</script>

{#await read}
	<Card title="Every one" flush><Skeleton height={TABLE} /></Card>
{:then { description, list, options }}
	{#if !description.ok}
		<Failed what="The catalog" failure={description.failure} />
	{:else}
		<Card title="Every {description.data.name}" flush>
			{#if list.ok}
				<ResourceList description={description.data} items={list.data.items} {options} {href} />
			{:else}
				<Failed what="The {description.data.plural}" failure={list.failure} />
			{/if}
		</Card>
		{#if creates}
			<Card title="New {description.data.name}">
				<ResourceForm description={description.data} {options} created={href} />
			</Card>
		{/if}
	{/if}
{/await}
