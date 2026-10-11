<script lang="ts">
	/**
	 * Where the page is, at the top bar's middle: each level above it a link, the page itself in
	 * words a reader may select. See spec/console/navigation.md.
	 */
	import * as stylex from '@stylexjs/stylex';
	import { duration, text } from '@canmi/kit/tokens/vocabulary.stylex';
	import type { Crumb } from '../levels.ts';
	import { type } from '../style.ts';

	let { trail }: { trail: readonly Crumb[] } = $props();

	const styles = stylex.create({
		crumb: {
			color: { default: 'var(--color-text-muted)', ':hover': 'var(--color-text-strong)' },
			fontSize: text.px14,
			transitionProperty: 'color',
			transitionDuration: duration.base,
		},
		here: {
			color: 'var(--color-text-strong)',
			fontSize: text.px14,
		},
		slash: {
			color: 'var(--color-line-strong)',
		},
		code: {
			color: 'var(--color-text-muted)',
			fontSize: text.px12,
		},
	});
</script>

{#snippet slash()}
	<svg
		class="shrink-0 {stylex.attrs(styles.slash).class}"
		width="16"
		height="16"
		viewBox="0 0 16 16"
		fill="none"
		aria-hidden="true"
	>
		<path d="M10.5 2.5 5.5 13.5" stroke="currentColor" stroke-width="1.25" stroke-linecap="round" />
	</svg>
{/snippet}

<nav aria-label="Breadcrumb" class="flex max-w-[40vw] min-w-0 items-center gap-2">
	{#each trail as crumb, index (index)}
		{#if index > 0}{@render slash()}{/if}
		{#if crumb.href}
			<a href={crumb.href} class="shrink-0 {stylex.attrs(styles.crumb).class}">{crumb.label}</a>
		{:else}
			<!-- What a reader would quote is selectable in a bar that is not; see
			     spec/console/design.md, "What can be selected". -->
			<span class="flex min-w-0 items-baseline gap-2 select-text" aria-current="page">
				<span class="truncate {stylex.attrs(styles.here, crumb.mono && type.mono).class}"
					>{crumb.label}</span
				>
				{#if crumb.code}
					<span class={stylex.attrs(type.mono, styles.code).class}>{crumb.code}</span>
				{/if}
			</span>
		{/if}
	{/each}
</nav>
