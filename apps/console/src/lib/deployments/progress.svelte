<script lang="ts">
	/**
	 * Where every node is with one run, one small cell each in the nodes' order: filled in its
	 * state's tone, a deploy still going filled as far as the stage it has reached, a skip hatched,
	 * a node that placed nothing left hollow and one that did not answer dashed. The words are in
	 * each cell's title and the whole strip's label, never the tone alone.
	 */
	import * as stylex from '@stylexjs/stylex';
	import { border, radius } from '@canmi/kit/tokens/vocabulary.stylex';
	import { nodeLabel } from '../map/places.ts';
	import { said, share, type NodeMark } from './state.ts';

	let { marks }: { marks: NodeMark[] } = $props();

	const words = (one: NodeMark) => `${nodeLabel(one.node)} ${said(one.mark, one.stage)}`;

	const styles = stylex.create({
		cell: {
			borderRadius: radius.sm,
			borderWidth: border.hairlinePx,
			borderStyle: 'solid',
			borderColor: 'transparent',
			overflow: 'hidden',
		},
		succeeded: { backgroundColor: 'var(--status-success)' },
		failed: { backgroundColor: 'var(--status-critical)' },
		running: {
			backgroundColor: 'color-mix(in srgb, var(--status-info) 22%, transparent)',
			borderColor: 'var(--status-info)',
		},
		skipped: {
			backgroundImage:
				'repeating-linear-gradient(45deg, var(--foreground-subtle) 0 1.5px, transparent 1.5px 4px)',
			borderColor: 'var(--foreground-subtle)',
		},
		absent: { borderColor: 'var(--border-strong)' },
		unknown: { borderColor: 'var(--status-warning)', borderStyle: 'dashed' },
		fill: { backgroundColor: 'var(--status-info)' },
	});
</script>

<span class="inline-flex items-center gap-0.5" role="img" aria-label={marks.map(words).join(', ')}>
	{#each marks as one (one.node)}
		<span
			class="relative inline-flex size-3 items-end {stylex.attrs(styles.cell, styles[one.mark])
				.class}"
			title={words(one)}
		>
			{#if one.mark === 'running'}
				<span
					class="w-full {stylex.attrs(styles.fill).class}"
					style:height="{share(one.stage) * 100}%"
				></span>
			{/if}
		</span>
	{/each}
</span>
