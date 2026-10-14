<script lang="ts">
	import { goto } from '$app/navigation';
	import Card from '#lib/card.svelte';
	import AccountCreate from '#lib/kinds/account-create.svelte';
	import KindPage from '#lib/kinds/kind-page.svelte';
	import { scoped } from '#lib/scope/context.js';
	import PageHeader from '#lib/ui/page-header.svelte';
	import Unpolished from '#lib/ui/unpolished.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const { to } = scoped();
	const href = (id: string) => to(`/accounts/${encodeURIComponent(id)}`);
</script>

<!-- An account is made in two steps rather than by the kind's one form; see
spec/console/navigation.md. -->
<Unpolished rfc="ott7y">
	<PageHeader title="Accounts" />
	<KindPage read={data.read} {href} creates={false} />
	{#await data.read then { description }}
		{#if description.ok}
			<Card title="New {description.data.name}">
				<AccountCreate description={description.data} onmade={(id) => goto(href(id))} />
			</Card>
		{/if}
	{/await}
</Unpolished>
