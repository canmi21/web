<script lang="ts">
	/** Where the page is, at the top bar's left: Design above each of its pages, then the page. */
	import { page } from '$app/state';
	import { pageAt } from './pages.ts';

	const here = $derived(pageAt(page.url.pathname));
	/** Every page under Design is reached from its overview, so the trail names it first. */
	const under = $derived(page.url.pathname.startsWith('/design/'));
</script>

<nav aria-label="Trail" class="flex min-w-0 items-center gap-2 text-sm">
	{#if under}
		<a
			href="/design"
			class="text-(--foreground-muted) transition-colors hover:text-(--foreground-strong)">Design</a
		>
	{/if}
	{#if here}
		{#if under}<span aria-hidden="true" class="text-(--border-strong)">/</span>{/if}
		<span aria-current="page" class="truncate text-(--foreground-strong)">{here.label}</span>
	{/if}
</nav>
