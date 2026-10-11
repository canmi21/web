<script lang="ts">
	/**
	 * The sheet a design page is laid out on: a card as the console's overview draws its own -- the
	 * surface, a hairline, its corners and its shadow -- as wide as the page's column and as tall as
	 * the page's region, so everything on the page is on it. See spec/architecture/space.md,
	 * "Specimens are laid on paper".
	 */
	import * as stylex from '@stylexjs/stylex';
	import type { Snippet } from 'svelte';
	import { borderWidth, radius } from '@canmi/design/scale.stylex';

	let { children }: { children: Snippet } = $props();

	const styles = stylex.create({
		paper: {
			display: 'flex',
			flexDirection: 'column',
			gap: '2.5rem',
			// The page's region less the top bar and the column's own insets, 2rem over and 3rem under.
			minHeight: 'calc(100dvh - 8.5rem)',
			padding: '2rem',
			borderRadius: radius.xl,
			backgroundColor: 'var(--background-surface)',
			boxShadow: `0 0 0 ${borderWidth.hairline} var(--border-default), var(--shadow-surface)`,
		},
	});
</script>

<div class={stylex.attrs(styles.paper).class}>{@render children()}</div>
