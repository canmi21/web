<script lang="ts">
	import type { Snippet } from 'svelte';
	import { dev } from '$app/env';
	import { afterNavigate } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import Shell from '@canmi/design/layouts/shell.svelte';
	import Head from '@canmi/space-ui/head.svelte';
	import PartSwitch from '@canmi/space-ui/part-switch.svelte';
	import PagesNav from '@canmi/space-ui/pages-nav.svelte';
	import SearchField from '@canmi/space-ui/search-field.svelte';
	import ThemeSwitch from '@canmi/space-ui/theme-switch.svelte';
	import { kept } from '@canmi/space-ui/state';
	import { levelOf } from '#lib/pages.ts';
	import Sections from '#lib/sections.svelte';
	import '@canmi/fonts/mono.css';
	import '../app.css';
	import type { LayoutData } from './$types';

	let { children, data }: { children: Snippet; data: LayoutData } = $props();

	const level = $derived(levelOf(page.url.pathname));

	/** Each page's place in the main area, kept for the tab as the console keeps its own. */
	let scroller: HTMLElement | undefined = $state();
	const place = kept.follow(() => page.url.pathname);
	afterNavigate(({ from, to }) => place.arrived(scroller, from?.url, to?.url));
	const moved = () => place.moved(scroller);
</script>

<svelte:head>
	<!-- The main area held back while a reload finds its place; see @canmi/space-ui/place. -->
	{@html kept.holdTag}
</svelte:head>

<Head {dev} base={resolve('/').replace(/\/$/, '')} marks={data.marks} />

<!-- See spec/architecture/space.md, "The shell is the console's". -->
<Shell label="Space" density="compact" span="bar" bind:main={scroller} onscroll={moved}>
	{#snippet corner()}<PartSwitch part="design" {dev} />{/snippet}
	{#snippet nav()}
		<PagesNav groups={level.groups} up={level.up} label="Design" path={page.url.pathname} />
	{/snippet}
	{#snippet start()}<Sections />{/snippet}
	{#snippet end()}
		<div class="w-60"><SearchField /></div>
		<ThemeSwitch />
	{/snippet}
	{@render children()}
</Shell>
<!-- A reload at its place before the first frame; see @canmi/space-ui/place. -->
{@html kept.placeTag}
