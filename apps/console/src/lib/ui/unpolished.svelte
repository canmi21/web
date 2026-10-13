<script lang="ts">
	/**
	 * A surface built for what it does and not yet for how it looks: in development it is marked
	 * `data-unpolished` and tagged at its corner with the RFC that polishes it; in production it is
	 * its children and nothing else. The one style this file writes is the tag's, and the check
	 * passes over it. See spec/console/polish.md.
	 */
	import * as stylex from '@stylexjs/stylex';
	import type { Snippet } from 'svelte';
	import { type } from '../style.ts';

	let { rfc, children }: { rfc: string; children: Snippet } = $props();

	// Read as it renders rather than through `$app/env`, so a test can draw both builds.
	const dev = import.meta.env.DEV;

	const styles = stylex.create({
		// The page's own column, so the surface lays out in development as it does without this.
		surface: {
			position: 'relative',
			display: 'flex',
			flexDirection: 'column',
			gap: 'inherit',
			minWidth: 0,
		},
		// Up in the page's top padding, over nothing the surface draws.
		tag: {
			position: 'absolute',
			insetBlockEnd: '100%',
			insetInlineEnd: 0,
			marginBlockEnd: '0.25rem',
			paddingInline: '0.375rem',
			borderRadius: '0.25rem',
			fontSize: '0.6875rem',
			lineHeight: '1.125rem',
			color: 'var(--text-secondary)',
			backgroundColor: 'var(--background-surface)',
			borderWidth: '1px',
			borderStyle: 'dashed',
			borderColor: 'var(--border-default)',
			pointerEvents: 'none',
		},
	});
</script>

{#if dev}
	<div data-unpolished={rfc} class={stylex.attrs(styles.surface).class}>
		<span class={stylex.attrs(styles.tag, type.mono).class} aria-hidden="true">
			unpolished, RFC {rfc}
		</span>
		{@render children()}
	</div>
{:else}
	{@render children()}
{/if}
