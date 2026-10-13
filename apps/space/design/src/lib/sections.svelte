<script lang="ts">
	/** The system's layers; the one holding the page reads strong, one with no page is no link. */
	import * as stylex from '@stylexjs/stylex';
	import { page } from '$app/state';
	import { duration, fontSize, radius } from '@canmi/design/scale.stylex';
	import { descends, ring } from '@canmi/space-ui/ring';
	import { LAYERS, entryOf, layerOf } from './pages.ts';

	const styles = stylex.create({
		list: { display: 'flex', flexShrink: 0, alignItems: 'center', gap: '0.25rem' },
		link: {
			display: 'flex',
			height: '2.25rem',
			alignItems: 'center',
			paddingInline: '0.5rem',
			whiteSpace: 'nowrap',
			borderRadius: radius.md,
			fontSize: fontSize.body,
			color: { default: 'var(--foreground-muted)', ':hover': 'var(--foreground-strong)' },
			transitionProperty: 'color',
			transitionDuration: duration.base,
		},
		current: { color: 'var(--foreground-strong)' },
		absent: { color: 'var(--foreground-subtle)', cursor: 'not-allowed' },
	});

	/** The layer holding the page being read. */
	const held = $derived(layerOf(page.url.pathname)?.label);
</script>

<nav aria-label="Sections" class={stylex.attrs(styles.list).class}>
	{#each LAYERS as section (section.label)}
		{@const href = entryOf(section)}
		{#if href}
			<a
				{href}
				aria-current={held === section.label ? 'true' : undefined}
				class={stylex.attrs(styles.link, held === section.label && styles.current, ring.host).class}
				><span class={stylex.attrs(ring.ink, descends(section.label) && ring.descends).class}
					>{section.label}</span
				></a
			>
		{:else}
			<span class={stylex.attrs(styles.link, styles.absent).class}
				><span class={stylex.attrs(ring.ink, descends(section.label) && ring.descends).class}
					>{section.label}</span
				></span
			>
		{/if}
	{/each}
</nav>
