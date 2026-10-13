<script lang="ts">
	import Card from '#lib/card.svelte';
	import Failed from '#lib/kinds/failed.svelte';
	import TaskList from '#lib/tasks/task-list.svelte';
	import PageHeader from '#lib/ui/page-header.svelte';
	import Skeleton from '#lib/ui/skeleton.svelte';
	import Unpolished from '#lib/ui/unpolished.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	/** A table's header and eight 44 px rows, before the read says how many it holds. */
	const TABLE = 9 * 44;
</script>

<Unpolished rfc="nlhfo">
	<PageHeader title="Tasks" />
	<Card title="Newest first" flush>
		{#await data.read}
			<Skeleton height={TABLE} label="Loading the tasks" />
		{:then read}
			{#if read.ok}
				<TaskList items={read.data.items} asked={data.asked} next={read.data.next} />
			{:else}
				<Failed what="The tasks" failure={read.failure} />
			{/if}
		{/await}
	</Card>
</Unpolished>
