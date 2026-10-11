<script lang="ts">
	import type { Snippet } from 'svelte';
	import { dev } from '$app/env';
	import { discloseGlobals, disclosureHead } from '@canmi/web/disclose';
	import Sidebar from '#lib/sidebar.svelte';
	import TopBar from '#lib/top-bar.svelte';
	import '@canmi/fonts/mono.css';
	import '../app.css';

	let { children }: { children: Snippet } = $props();

	/**
	 * The visual layer in development, linked as the console links it: the layer order first, then
	 * the sheet. See spec/architecture/css/layers.md, "In development the visual layer arrives with
	 * its runtime, and must not be linked".
	 */
	const DEV_STYLEX =
		'<style>@layer properties, theme, base, components, utilities;</style>' +
		'<link rel="stylesheet" href="/virtual:stylex.css">';

	if (dev) {
		$effect(() => {
			void import('virtual:stylex:runtime');
		});
	}

	// What the app is made of, said for Wappalyzer from the build; see lib's spec/web/disclose.md.
	const disclosure = import.meta.env.VITE_DISCLOSURE;
	discloseGlobals(disclosure);
</script>

<svelte:head>
	<!-- First in the head on purpose: it declares the order the layers below it take. -->
	{#if dev}{@html DEV_STYLEX}{/if}
	{@html disclosureHead(disclosure)}
</svelte:head>

<!-- Three fixed regions where there is room, and only the page scrolls, as the console's do; one
     column that scrolls whole where there is not. -->
<Sidebar />
<TopBar />
<main
	id="content"
	class="md:fixed md:top-14 md:right-0 md:bottom-0 md:left-60 md:overflow-y-auto md:overscroll-contain"
>
	<div class="mx-auto flex w-full max-w-[90rem] flex-col px-8 pt-8 pb-12">
		{@render children()}
	</div>
</main>
