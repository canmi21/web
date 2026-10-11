<script lang="ts">
	/** Each group of space's pages under its heading, the page being read held selected. */
	import * as stylex from '@stylexjs/stylex';
	import { page } from '$app/state';
	import { fontSize, fontWeight } from '@canmi/design/scale.stylex';
	import NavLink from '@canmi/design/components/nav-link.svelte';
	import { GROUPS } from './pages.ts';

	const styles = stylex.create({
		/** Half a link's height, so the list keeps its rhythm in half steps. */
		heading: {
			display: 'flex',
			height: '1.125rem',
			alignItems: 'center',
			paddingInline: '0.75rem',
			color: 'var(--foreground-subtle)',
			fontSize: fontSize.caption,
			fontWeight: fontWeight.medium,
			lineHeight: 1,
		},
	});
</script>

<nav aria-label="Space" class="flex flex-col gap-1">
	{#each GROUPS as group, index (index)}
		{#if group.label}
			<h2 class={stylex.attrs(styles.heading).class}>{group.label}</h2>
		{/if}
		{#each group.pages as one (one.href)}
			<NavLink {...one} current={page.url.pathname === one.href ? 'page' : false} />
		{/each}
	{/each}
</nav>
