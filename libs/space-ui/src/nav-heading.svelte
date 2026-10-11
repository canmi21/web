<script lang="ts">
	/**
	 * A heading in a sidebar's list, half a link tall so the list keeps its rhythm in half steps,
	 * its words at that half's bottom by default, against the links it names below.
	 */
	import * as stylex from '@stylexjs/stylex';
	import type { Snippet } from 'svelte';
	import { fontSize, fontWeight } from '@canmi/design/scale.stylex';

	let { align = 'bottom', children }: { align?: 'top' | 'bottom'; children: Snippet } = $props();

	const styles = stylex.create({
		heading: {
			display: 'flex',
			height: '1.125rem',
			paddingInline: '0.75rem',
			color: 'var(--foreground-subtle)',
			fontSize: fontSize.caption,
			fontWeight: fontWeight.medium,
			lineHeight: 1,
		},
		top: { alignItems: 'flex-start' },
		bottom: { alignItems: 'flex-end' },
	});
</script>

<h2 class={stylex.attrs(styles.heading, align === 'top' ? styles.top : styles.bottom).class}>
	{@render children()}
</h2>
