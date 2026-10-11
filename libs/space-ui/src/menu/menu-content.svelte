<script lang="ts">
	/**
	 * A menu's panel: the surface ruled and shadowed, its rows edge to edge with no inset of its
	 * own, scrolled without a bar where the window is too short. The rows are ./menu-row.svelte;
	 * both as the console draws its own, spec/console/design.md, "Every menu is built from one
	 * panel and one row".
	 */
	import * as stylex from '@stylexjs/stylex';
	import { DropdownMenu } from 'bits-ui';
	import type { Snippet } from 'svelte';
	import { borderWidth, fontSize, radius } from '@canmi/design/scale.stylex';

	let {
		label,
		sideOffset = 6,
		alignOffset = 0,
		anchor,
		children,
	}: {
		/** What the menu is of, for assistive technology. */
		label: string;
		sideOffset?: number;
		alignOffset?: number;
		/** What it opens under, where that is more than its trigger. */
		anchor?: HTMLElement;
		children: Snippet;
	} = $props();

	const styles = stylex.create({
		menu: {
			zIndex: 40,
			display: 'flex',
			flexDirection: 'column',
			width: 'max-content',
			minWidth: 'max(var(--bits-floating-anchor-width), 11rem)',
			maxHeight: 'var(--bits-floating-available-height)',
			overflowY: 'auto',
			backgroundColor: 'var(--background-surface)',
			borderWidth: borderWidth.hairline,
			borderStyle: 'solid',
			borderColor: 'var(--border-default)',
			borderRadius: radius.lg,
			boxShadow: '0 4px 12px rgb(0 0 0 / 0.25), 0 1px 3px rgb(0 0 0 / 0.2)',
			fontSize: fontSize.body,
			scrollbarWidth: 'none',
		},
	});
</script>

<DropdownMenu.Portal>
	<DropdownMenu.Content
		{sideOffset}
		align="start"
		{alignOffset}
		customAnchor={anchor}
		loop
		aria-label={label}
		class={stylex.attrs(styles.menu).class}
	>
		{@render children()}
	</DropdownMenu.Content>
</DropdownMenu.Portal>
