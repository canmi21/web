<script lang="ts">
	/**
	 * What every part of space puts in the head before its own: the visual layer's order in
	 * development, what the app is made of, and the marks. See spec/architecture/space.md.
	 */
	import { discloseGlobals, disclosureHead } from '@canmi/web/disclose';

	let {
		dev,
		base,
		marks,
	}: {
		dev: boolean;
		/** The part's own path, which development's stylesheet is served under. */
		base: string;
		/** Each mark's object; one that resolved to nothing is left out. */
		marks: Partial<Record<'favicon.svg' | 'favicon.ico', string>>;
	} = $props();

	/**
	 * The visual layer in development: the layer order first, then the sheet. See
	 * spec/architecture/css/layers.md, "In development the visual layer arrives with its runtime,
	 * and must not be linked".
	 */
	const devStylex = $derived(
		'<style>@layer properties, theme, base, components, utilities;</style>' +
			`<link rel="stylesheet" href="${base}/virtual:stylex.css">`,
	);

	$effect(() => {
		if (dev) void import('virtual:stylex:runtime');
	});

	// What the app is made of, said for Wappalyzer from the build; see lib's spec/web/disclose.md.
	const disclosure = import.meta.env.VITE_DISCLOSURE;
	discloseGlobals(disclosure);
</script>

<svelte:head>
	<!-- First in the head on purpose: it declares the order the layers below it take. -->
	{#if dev}{@html devStylex}{/if}
	{@html disclosureHead(disclosure)}
	{#if marks['favicon.svg']}
		<link rel="icon" type="image/svg+xml" sizes="any" href={marks['favicon.svg']} />
	{/if}
	{#if marks['favicon.ico']}
		<link rel="icon" sizes="48x48" href={marks['favicon.ico']} />
	{/if}
</svelte:head>
