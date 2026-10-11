<script lang="ts">
	/** One group of specimens under its name, set apart from the next by space alone. */
	import * as stylex from '@stylexjs/stylex';
	import type { Snippet } from 'svelte';
	import { fontSize, fontWeight } from '@canmi/design/scale.stylex';

	let { label, children }: { label: string; children: Snippet } = $props();

	const styles = stylex.create({
		section: { display: 'flex', flexDirection: 'column', gap: '0.75rem' },
		label: {
			color: 'var(--foreground-muted)',
			fontSize: fontSize.label,
			fontWeight: fontWeight.medium,
		},
	});
</script>

<section class={stylex.attrs(styles.section).class}>
	<h2 class={stylex.attrs(styles.label).class}>{label}</h2>
	{@render children()}
</section>
