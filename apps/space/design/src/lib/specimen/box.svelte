<script lang="ts" module>
	/** How far the box stands above and below its row, as a share of what is left either side. */
	export type Ratio = '1' | '2/3' | '1/2' | '1/3';

	const SHARE: Record<Ratio, number> = { '1': 1, '2/3': 2 / 3, '1/2': 1 / 2, '1/3': 1 / 3 };
</script>

<script lang="ts">
	/**
	 * The box a specimen stands in: the card again, on the page's own ground, holding a row centered
	 * in it. Its space above and below is a share of the space the row leaves either side, worked out
	 * from the card's width as it is, so the row stands in the same proportion at any width, and
	 * never nearer an edge than `SIDE`. `row` is the row's width at its largest.
	 */
	import * as stylex from '@stylexjs/stylex';
	import type { Snippet } from 'svelte';
	import { borderWidth, radius } from '@canmi/design/scale.stylex';

	let {
		row,
		ratio = '1/2',
		children,
	}: { row: string; ratio?: Ratio; children: Snippet } = $props();

	/** The least the box keeps between the row and any of its edges, in rem. */
	const SIDE = 2;

	const block = $derived(`max(${SIDE}rem, calc((100cqw - ${row}) / 2 * ${SHARE[ratio]}))`);

	const styles = stylex.create({
		box: {
			display: 'flex',
			justifyContent: 'center',
			paddingInline: `${SIDE}rem`,
			borderWidth: borderWidth.hairline,
			borderStyle: 'solid',
			borderColor: 'var(--border-default)',
			borderRadius: radius.lg,
			backgroundColor: 'var(--background-base)',
		},
	});
</script>

<div class={stylex.attrs(styles.box).class} style:padding-block={block}>
	{@render children()}
</div>
