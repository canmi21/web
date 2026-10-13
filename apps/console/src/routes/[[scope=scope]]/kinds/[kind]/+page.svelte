<script lang="ts">
	import KindPage from '#lib/kinds/kind-page.svelte';
	import { pluralLabel } from '#lib/kinds/view.js';
	import { scoped } from '#lib/scope/context.js';
	import PageHeader from '#lib/ui/page-header.svelte';
	import Unpolished from '#lib/ui/unpolished.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const { to } = scoped();
</script>

<Unpolished rfc="ott7y">
	<PageHeader title={pluralLabel(data.kind)} />
	<KindPage
		read={data.read}
		href={(one) => to(`/kinds/${encodeURIComponent(data.kind)}/${encodeURIComponent(one.name)}`)}
	/>
</Unpolished>
