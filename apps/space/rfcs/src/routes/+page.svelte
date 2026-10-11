<script lang="ts">
	import RfcList from '#lib/rfc-list.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<svelte:head>
	<title>RFCs</title>
</svelte:head>

<RfcList title="RFCs" sentence="Why each decision was made, newest first." rfcs={data.rfcs} />
