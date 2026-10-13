<script lang="ts">
	import KindPage from '#lib/kinds/kind-page.svelte';
	import { scoped } from '#lib/scope/context.js';
	import PageHeader from '#lib/ui/page-header.svelte';
	import Unpolished from '#lib/ui/unpolished.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const { to } = scoped();
</script>

<Unpolished rfc="ott7y">
	<PageHeader title="Accounts" />
	<KindPage read={data.read} href={(one) => to(`/accounts/${encodeURIComponent(one.name)}`)} />
</Unpolished>
