<script lang="ts">
	import RfcList from '#lib/rfc-list.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const title = $derived(data.scope.charAt(0).toUpperCase() + data.scope.slice(1));
</script>

<svelte:head>
	<title>{title} · RFCs</title>
</svelte:head>

<RfcList {title} sentence={`RFCs about ${data.about}.`} rfcs={data.rfcs} />
