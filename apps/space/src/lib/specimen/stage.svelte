<script lang="ts">
	/**
	 * A box on the paper that holds specimens: the page's own ground inside a hairline, not the
	 * paper's, since what it holds may be a card, and a card is drawn to stand on the ground. Its
	 * inset is a frame around what it holds, as oklch.fyi frames a palette. See
	 * spec/architecture/space.md, "Specimens are laid on paper".
	 */
	import * as stylex from '@stylexjs/stylex';
	import type { Snippet } from 'svelte';
	import { borderWidth, radius } from '@canmi/design/scale.stylex';

	let { children }: { children: Snippet } = $props();

	const styles = stylex.create({
		stage: {
			display: 'flex',
			width: 'fit-content',
			maxWidth: '100%',
			padding: '0.375rem',
			borderRadius: radius.xl,
			backgroundColor: 'var(--background-base)',
			boxShadow: `0 0 0 ${borderWidth.hairline} var(--border-default)`,
		},
	});
</script>

<div class={stylex.attrs(styles.stage).class}>{@render children()}</div>
