<script lang="ts">
	/**
	 * An account's `Nodes` page as it is read: the nodes under it and every other, drawn once read
	 * by ./account-node-list.svelte, or why they could not be. spec/console/navigation.md.
	 */
	import Card from '../card.svelte';
	import type { Description } from '../control/catalog.gen.ts';
	import type { Control, List, Resource } from '../control/types.ts';
	import Skeleton from '../ui/skeleton.svelte';
	import AccountNodeList from './account-node-list.svelte';
	import Failed from './failed.svelte';
	import type { Options } from './form.ts';

	let {
		read,
		account,
		href,
	}: {
		read: Read | Promise<Read>;
		/** The account's id, which a node under it holds as its `account`. */
		account: string;
		/** Where a node is read, by its name. */
		href: (name: string) => string;
	} = $props();

	type Read = {
		description: Control<Description>;
		list: Control<List>;
		options: Options;
		others: Resource[];
	};

	/** A table's header and eight 44 px rows, before the read says how many it holds. */
	const TABLE = 9 * 44;
</script>

{#await read}
	<Card title="Nodes under this account" flush><Skeleton height={TABLE} /></Card>
{:then { description, list, options, others }}
	{#if !description.ok}
		<Failed what="The catalog" failure={description.failure} />
	{:else if !list.ok}
		<Failed what="The nodes" failure={list.failure} />
	{:else}
		<AccountNodeList
			kind={description.data}
			items={list.data.items}
			{options}
			{others}
			{account}
			{href}
		/>
	{/if}
{/await}
