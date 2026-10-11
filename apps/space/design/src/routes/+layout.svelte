<script lang="ts">
	import type { Snippet } from 'svelte';
	import { dev } from '$app/env';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import Shell from '@canmi/design/layouts/shell.svelte';
	import Head from '@canmi/space-ui/head.svelte';
	import PartSwitch from '@canmi/space-ui/part-switch.svelte';
	import PagesNav from '@canmi/space-ui/pages-nav.svelte';
	import SearchField from '@canmi/space-ui/search-field.svelte';
	import ThemeSwitch from '@canmi/space-ui/theme-switch.svelte';
	import { GROUPS } from '#lib/pages.ts';
	import Sections from '#lib/sections.svelte';
	import '@canmi/fonts/mono.css';
	import '../app.css';
	import type { LayoutData } from './$types';

	let { children, data }: { children: Snippet; data: LayoutData } = $props();
</script>

<Head {dev} base={resolve('/').replace(/\/$/, '')} marks={data.marks} />

<!-- See spec/architecture/space.md, "The shell is the console's". -->
<Shell label="Space" density="compact" span="bar">
	{#snippet corner()}<PartSwitch part="design" {dev} />{/snippet}
	{#snippet nav()}<PagesNav groups={GROUPS} label="Design" path={page.url.pathname} />{/snippet}
	{#snippet start()}<Sections />{/snippet}
	{#snippet end()}
		<div class="w-60"><SearchField /></div>
		<ThemeSwitch />
	{/snippet}
	{@render children()}
</Shell>
