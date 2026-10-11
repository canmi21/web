<script lang="ts">
	/**
	 * One row of a menu, leading somewhere: the menu's whole width, washed under the pointer, a
	 * mark's column each side of its words -- the left for what the row is, the right for a check on
	 * the one chosen -- so every row's words start at one edge. As the console draws its rows,
	 * spec/console/design.md, "Every menu is built from one panel and one row".
	 */
	import * as stylex from '@stylexjs/stylex';
	import { DropdownMenu } from 'bits-ui';
	import type { Snippet } from 'svelte';
	import Icon from '@canmi/design/components/icon.svelte';
	import type { IconComponent } from '@canmi/design/components/icon';

	let {
		href,
		lead,
		trail,
		current = false,
		children,
	}: {
		href: string;
		/** The left column's mark. */
		lead?: IconComponent;
		/** The right column's mark. */
		trail?: IconComponent;
		/** The page or part it stands for is the one open. */
		current?: boolean;
		children: Snippet;
	} = $props();

	const styles = stylex.create({
		row: {
			position: 'relative',
			display: 'flex',
			flexShrink: 0,
			alignItems: 'center',
			gap: '0.375rem',
			height: '1.75rem',
			paddingInline: '0.5rem',
			cursor: 'pointer',
			outline: 'none',
			color: { default: 'var(--foreground-muted)', ':hover': 'var(--foreground-strong)' },
			backgroundColor: {
				default: 'transparent',
				':hover': 'var(--interaction-default)',
				':focus-visible': 'var(--interaction-default)',
			},
		},
		column: { display: 'flex', flexShrink: 0, justifyContent: 'center', width: '0.875rem' },
		muted: { color: 'var(--foreground-muted)' },
		words: { flexGrow: 1, whiteSpace: 'nowrap' },
	});
</script>

{#snippet column(icon: IconComponent | undefined, strong: boolean)}
	<span aria-hidden="true" class={stylex.attrs(styles.column, !strong && styles.muted).class}>
		{#if icon}<Icon {icon} size={14} />{/if}
	</span>
{/snippet}

<DropdownMenu.Item>
	{#snippet child({ props })}
		<a
			{...props}
			{href}
			aria-current={current ? 'page' : undefined}
			class={stylex.attrs(styles.row).class}
		>
			{@render column(lead, false)}
			<span class={stylex.attrs(styles.words).class}>{@render children()}</span>
			{@render column(trail, current)}
		</a>
	{/snippet}
</DropdownMenu.Item>
