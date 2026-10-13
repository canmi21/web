<script lang="ts">
	import KindPage from '#lib/kinds/kind-page.svelte';
	import ResourcePage from '#lib/kinds/resource-page.svelte';
	import { scoped } from '#lib/scope/context.js';
	import { labelOf, shortId } from '#lib/kinds/view.js';
	import PageHeader from '#lib/ui/page-header.svelte';
	import Unpolished from '#lib/ui/unpolished.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const { node } = scoped();

	/** The overview's read when it is in hand, as on the document's own response. */
	const held = $derived(data.overview instanceof Promise ? undefined : data.overview);
	/** Its provider and short id where the overview is in hand, its short id otherwise. */
	const title = $derived(
		held?.description.ok && held.resource.ok
			? labelOf(held.description.data, held.resource.data)
			: shortId(data.id),
	);
</script>

<!-- The page open is the sidebar's; see spec/console/navigation.md. -->
<Unpolished rfc="ott7y">
	<PageHeader {title} />
	{#if data.overview}
		<ResourcePage read={data.overview} />
	{:else if data.nodes}
		<KindPage read={data.nodes} creates={false} href={(name) => node(name)} />
	{/if}
</Unpolished>
