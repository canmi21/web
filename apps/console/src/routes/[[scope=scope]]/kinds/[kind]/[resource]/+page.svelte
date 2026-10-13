<script lang="ts">
	import ResourcePage from '#lib/kinds/resource-page.svelte';
	import PageHeader from '#lib/ui/page-header.svelte';
	import Unpolished from '#lib/ui/unpolished.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<!-- A record with one page, kept under its kind; see spec/console/navigation.md. -->
<Unpolished rfc="ott7y">
	<PageHeader title={data.resource} />
	<ResourcePage read={data.read} />
</Unpolished>
