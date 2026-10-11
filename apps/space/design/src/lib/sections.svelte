<script lang="ts">
	/** The system's layers; the one holding the page reads strong, one with no page is no link. */
	import * as stylex from '@stylexjs/stylex';
	import { page } from '$app/state';
	import { duration, fontSize, radius } from '@canmi/design/scale.stylex';
	import { GROUPS, SECTIONS } from './pages.ts';

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

	/** The layer whose group lists the page being read. */
	const held = $derived(
		GROUPS.find((group) => group.pages.some((one) => one.href === page.url.pathname))?.label,
	);
</script>

<nav aria-label="Sections" class={stylex.attrs(styles.list).class}>
	{#each SECTIONS as section (section.label)}
		{#if section.href}
			<a
				href={section.href}
				aria-current={held === section.label ? 'true' : undefined}
				class={stylex.attrs(styles.link, held === section.label && styles.current).class}
				>{section.label}</a
			>
		{:else}
			<span class={stylex.attrs(styles.link, styles.absent).class}>{section.label}</span>
		{/if}
	{/each}
</nav>
