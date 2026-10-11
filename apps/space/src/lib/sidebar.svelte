<script lang="ts">
	/**
	 * Where space goes: the way in to finding at its head, then each group of pages under its
	 * heading. Fixed down the left edge where there is room, and above the page where there is not.
	 */
	import * as stylex from '@stylexjs/stylex';
	import { page } from '$app/state';
	import { fontSize, fontWeight } from '@canmi/design/scale.stylex';
	import NavLink from './nav-link.svelte';
	import SearchField from './search-field.svelte';
	import { GROUPS } from './pages.ts';

	const styles = stylex.create({
		heading: {
			paddingInline: '0.75rem',
			paddingTop: '1rem',
			paddingBottom: '0.375rem',
			color: 'var(--foreground-subtle)',
			fontSize: fontSize.caption,
			fontWeight: fontWeight.medium,
		},
	});
</script>

<aside
	aria-label="Space"
	class="flex flex-col border-b border-(--border-subtle) bg-(--background-base) md:fixed md:inset-y-0 md:left-0 md:z-30 md:w-60 md:border-r md:border-b-0"
>
	<!-- As tall as the top bar, so the two heads read as one band. -->
	<div class="flex h-14 shrink-0 items-center px-3">
		<SearchField />
	</div>
	<nav class="flex flex-col gap-1 overflow-y-auto px-3 pt-1 pb-3">
		{#each GROUPS as group, index (index)}
			{#if group.label}
				<h2 class={stylex.attrs(styles.heading).class}>{group.label}</h2>
			{/if}
			{#each group.pages as one (one.href)}
				<NavLink {...one} current={page.url.pathname === one.href} />
			{/each}
		{/each}
	</nav>
</aside>
