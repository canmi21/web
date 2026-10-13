<script lang="ts">
	import KindPage from '#lib/kinds/kind-page.svelte';
	import ResourcePage from '#lib/kinds/resource-page.svelte';
	import { scoped } from '#lib/scope/context.js';
	import PageHeader from '#lib/ui/page-header.svelte';
	import Unpolished from '#lib/ui/unpolished.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const { node } = scoped();
</script>

<!-- The page open is the sidebar's; see spec/console/navigation.md. -->
<Unpolished rfc="ott7y">
	<PageHeader title={data.name} />
	{#if data.overview}
		<ResourcePage read={data.overview} />
	{:else if data.nodes}
		<KindPage read={data.nodes} creates={false} href={(one) => node(one.name)} />
	{/if}
</Unpolished>
