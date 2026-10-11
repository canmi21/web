<script lang="ts">
	/** The trail to the page on the left, and the switch between light and dark on the right. */
	import { page } from '$app/state';
	import ThemeSwitch from './theme-switch.svelte';
	import { pageAt } from './pages.ts';

	const here = $derived(pageAt(page.url.pathname));
	/** Every page under Design is reached from its overview, so the trail names it first. */
	const under = $derived(page.url.pathname.startsWith('/design/'));
</script>

<header
	class="flex h-14 shrink-0 items-center justify-between gap-4 border-b border-(--border-subtle) bg-(--background-base) px-8 md:fixed md:top-0 md:right-0 md:left-60 md:z-30"
>
	<nav aria-label="Trail" class="flex min-w-0 items-center gap-2 text-sm">
		{#if under}
			<a
				href="/design"
				class="text-(--foreground-muted) transition-colors hover:text-(--foreground-strong)"
				>Design</a
			>
			<span aria-hidden="true" class="text-(--border-strong)">/</span>
		{/if}
		{#if here}
			<span aria-current="page" class="truncate text-(--foreground-strong)">{here.label}</span>
		{/if}
	</nav>
	<ThemeSwitch />
</header>
