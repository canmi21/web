<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import Card from '#lib/card.svelte';
	import Failed from '#lib/kinds/failed.svelte';
	import TaskFollow from '#lib/kinds/task-follow.svelte';
	import TaskTimeline from '#lib/tasks/task-timeline.svelte';
	import PageHeader from '#lib/ui/page-header.svelte';
	import Skeleton from '#lib/ui/skeleton.svelte';
	import Unpolished from '#lib/ui/unpolished.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<!-- A record with one page, kept in Tasks; see spec/console/navigation.md. -->
<Unpolished rfc="nlhfo">
	<PageHeader title="{data.service} {data.id}" />
	<Card>
		{#await data.read}
			<Skeleton height={320} label="Loading the task" />
		{:then read}
			{#if read.ok}
				{#if read.data.state === 'queued' || read.data.state === 'running'}
					<TaskFollow service={data.service} id={data.id} onsettled={() => invalidateAll()} />
				{/if}
				<TaskTimeline task={read.data} />
			{:else}
				<Failed what="The task" failure={read.failure} />
			{/if}
		{/await}
	</Card>
</Unpolished>
