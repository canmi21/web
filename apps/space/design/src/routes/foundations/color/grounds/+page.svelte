<script lang="ts">
	/**
	 * The two grounds built into a page, in the page's theme: a blank page as the shell frames one,
	 * its top bar and sidebar on the surface, the page on the base with cards on the surface again,
	 * and a field set into the bar on the base. Words are bars, so only the grounds are read.
	 */
	import * as stylex from '@stylexjs/stylex';
	import { borderWidth, radius } from '@canmi/design/scale.stylex';
	import Card from '#lib/specimen/card.svelte';

	const styles = stylex.create({
		/** The card again, on the page's own ground, the window standing in its middle. */
		box: {
			display: 'flex',
			justifyContent: 'center',
			padding: '3rem',
			borderWidth: borderWidth.hairline,
			borderStyle: 'solid',
			borderColor: 'var(--border-default)',
			borderRadius: radius.xl,
			backgroundColor: 'var(--background-base)',
		},
		/** The blank page, a window of a screen's proportions, never stretched to the card. */
		page: {
			width: '100%',
			maxWidth: '40rem',
			aspectRatio: '16 / 9',
			display: 'grid',
			overflow: 'hidden',
			borderWidth: borderWidth.hairline,
			borderStyle: 'solid',
			borderColor: 'var(--border-default)',
			borderRadius: radius.xl,
			backgroundColor: 'var(--background-base)',
			gridTemplateColumns: '22% 1fr',
			gridTemplateRows: '2.75rem 1fr',
		},
		bar: {
			gridColumn: '1 / -1',
			display: 'flex',
			alignItems: 'center',
			justifyContent: 'space-between',
			paddingInline: '1rem',
			borderBottomWidth: borderWidth.hairline,
			borderBottomStyle: 'solid',
			borderBottomColor: 'var(--border-subtle)',
			backgroundColor: 'var(--background-surface)',
		},
		field: {
			width: '36%',
			height: '1.625rem',
			borderWidth: borderWidth.hairline,
			borderStyle: 'solid',
			borderColor: 'var(--border-default)',
			borderRadius: radius.md,
			backgroundColor: 'var(--background-base)',
		},
		sidebar: {
			display: 'flex',
			flexDirection: 'column',
			gap: '0.25rem',
			padding: '0.75rem',
			borderRightWidth: borderWidth.hairline,
			borderRightStyle: 'solid',
			borderRightColor: 'var(--border-subtle)',
			backgroundColor: 'var(--background-surface)',
		},
		/** A sidebar's entry, the one open on the selection's rank. */
		entry: {
			display: 'flex',
			alignItems: 'center',
			height: '1.75rem',
			paddingInline: '0.5rem',
			borderRadius: radius.md,
		},
		open: { backgroundColor: 'var(--interaction-muted)' },
		main: {
			display: 'grid',
			gridTemplateColumns: '1fr 1fr',
			gridTemplateRows: 'auto 1fr',
			gap: '0.75rem',
			padding: '1rem',
			minHeight: 0,
		},
		card: {
			display: 'flex',
			flexDirection: 'column',
			padding: '0.875rem',
			borderWidth: borderWidth.hairline,
			borderStyle: 'solid',
			borderColor: 'var(--border-default)',
			borderRadius: radius.lg,
			backgroundColor: 'var(--background-surface)',
		},
		wide: { gridColumn: '1 / -1', paddingBlock: '0.25rem' },
		/** A figure's card: its name and its value at the left, its trend at the right. */
		figure: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
		stack: { display: 'flex', flexDirection: 'column', gap: '0.625rem' },
		/** Words, drawn as a bar of a skeleton's rank. */
		words: {
			height: '0.4375rem',
			borderRadius: radius.full,
			backgroundColor: 'var(--interaction-strong)',
		},
		/** Words of less weight: a label, a value's unit, a row's detail. */
		quiet: { backgroundColor: 'var(--interaction-default)' },
		/** A figure's value, drawn as a bar of a figure's height. */
		value: { height: '0.875rem', borderRadius: radius.sm },
		trend: {
			width: '3.5rem',
			height: '1.5rem',
			color: 'var(--border-strong)',
		},
		/** A list's head and each of its rows, the rows ruled apart. */
		row: {
			display: 'flex',
			alignItems: 'center',
			gap: '0.625rem',
			height: '2.25rem',
		},
		ruled: {
			borderTopWidth: borderWidth.hairline,
			borderTopStyle: 'solid',
			borderTopColor: 'var(--border-subtle)',
		},
		dot: {
			flexShrink: 0,
			width: '0.5rem',
			height: '0.5rem',
			borderRadius: radius.full,
			backgroundColor: 'var(--interaction-strong)',
		},
		/** What stands at a row's end, pushed there. */
		end: { marginLeft: 'auto' },
		pill: {
			width: '2.75rem',
			height: '1.125rem',
			borderRadius: radius.full,
			backgroundColor: 'var(--interaction-default)',
		},
	});

	/** How long each entry's words are drawn, as shares of their width. */
	const ENTRIES = ['62%', '48%', '70%', '54%'];
	/** Each figure's trend, as points on a line 60 wide and 24 tall. */
	const TRENDS = ['0,18 12,14 24,16 36,8 48,10 60,4', '0,8 12,12 24,6 36,14 48,12 60,18'];
	/** Each row's name and detail, as widths. */
	const ROWS = [
		['38%', '3rem'],
		['30%', '2.25rem'],
		['44%', '3.5rem'],
		['26%', '2.5rem'],
	];
</script>

<svelte:head>
	<title>Grounds</title>
</svelte:head>

<Card
	title="Grounds"
	rule="Regions stand on the surface, a step off the page's base, and what is set into them on the base again, apart by ground and border alone."
	rfc="c656n"
>
	<div class={stylex.attrs(styles.box).class}>
		<div class={stylex.attrs(styles.page).class} aria-hidden="true">
			<div class={stylex.attrs(styles.bar).class}>
				<span class={stylex.attrs(styles.words).class} style:width="3.5rem"></span>
				<span class={stylex.attrs(styles.field).class}></span>
			</div>
			<div class={stylex.attrs(styles.sidebar).class}>
				{#each ENTRIES as width, index (index)}
					<span class={stylex.attrs(styles.entry, index === 0 && styles.open).class}>
						<span class={stylex.attrs(styles.words).class} style:width></span>
					</span>
				{/each}
			</div>
			<div class={stylex.attrs(styles.main).class}>
				{#each TRENDS as points (points)}
					<div class={stylex.attrs(styles.card, styles.figure).class}>
						<div class={stylex.attrs(styles.stack).class}>
							<span class={stylex.attrs(styles.words, styles.quiet).class} style:width="3rem"
							></span>
							<span class={stylex.attrs(styles.words, styles.value).class} style:width="4.5rem"
							></span>
						</div>
						<svg class={stylex.attrs(styles.trend).class} viewBox="0 0 60 24" fill="none">
							<polyline
								{points}
								stroke="currentColor"
								stroke-width="1.5"
								stroke-linecap="round"
								stroke-linejoin="round"
								vector-effect="non-scaling-stroke"
							/>
						</svg>
					</div>
				{/each}
				<div class={stylex.attrs(styles.card, styles.wide).class}>
					<div class={stylex.attrs(styles.row).class}>
						<span class={stylex.attrs(styles.words).class} style:width="5rem"></span>
						<span class={stylex.attrs(styles.pill, styles.end).class}></span>
					</div>
					{#each ROWS as [name, detail], index (index)}
						<div class={stylex.attrs(styles.row, styles.ruled).class}>
							<span class={stylex.attrs(styles.dot).class}></span>
							<span class={stylex.attrs(styles.words).class} style:width={name}></span>
							<span
								class={stylex.attrs(styles.words, styles.quiet, styles.end).class}
								style:width={detail}
							></span>
						</div>
					{/each}
				</div>
			</div>
		</div>
	</div>
</Card>
