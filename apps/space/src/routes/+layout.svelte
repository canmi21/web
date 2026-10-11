<script lang="ts">
	import type { Snippet } from 'svelte';
	import { dev } from '$app/env';
	import { discloseGlobals, disclosureHead } from '@canmi/web/disclose';
	import Shell from '@canmi/design/layouts/shell.svelte';
	import PagesNav from '#lib/pages-nav.svelte';
	import SearchField from '#lib/search-field.svelte';
	import ThemeSwitch from '#lib/theme-switch.svelte';
	import Trail from '#lib/trail.svelte';
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

<!-- The console's frame, from @canmi/design; see spec/architecture/space.md, "The shell is the
     console's". -->
<Shell label="Space">
	{#snippet head()}<SearchField />{/snippet}
	{#snippet nav()}<PagesNav />{/snippet}
	{#snippet start()}<Trail />{/snippet}
	{#snippet end()}<ThemeSwitch />{/snippet}
	{@render children()}
</Shell>
