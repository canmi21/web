<script lang="ts">
	/**
	 * What a line holds besides its letters: the room over its capitals and under its baseline, a box
	 * set in to its words' capitals rather than to their line, and the capital height Chrome misreads
	 * from this sans -- RFC 0gmzi and RFC mpy16. The letters on the first and last cards are drawn
	 * large, as a figure, not set as words to read.
	 */
	import * as stylex from '@stylexjs/stylex';
	import { borderWidth, fontSize, fontWeight, radius } from '@canmi/design/scale.stylex';
	import Box from '#lib/specimen/box.svelte';
	import Card from '#lib/specimen/card.svelte';

	/** The size the letters are drawn at, and the inset the card on the second card is set in by. */
	const DRAWN = '4rem';
	const INSET = '1.25rem';

	/** A line far longer than any figure, so a band crosses it and its box clips it. */
	const ACROSS = { left: '-50em', width: '100em' };

	const styles = stylex.create({
		/** A line of letters drawn large, in its own box, which clips what crosses it. */
		line: {
			position: 'relative',
			isolation: 'isolate',
			overflow: 'hidden',
			paddingInline: '1.5rem',
			outlineWidth: borderWidth.hairline,
			outlineStyle: 'dashed',
			outlineColor: 'var(--border-strong)',
			fontSize: DRAWN,
			fontWeight: fontWeight.medium,
			lineHeight: 1.5,
			color: 'var(--foreground-strong)',
		},
		/** A mark of no size on the baseline, which the guides are set out from. */
		baseline: {
			position: 'relative',
			display: 'inline-block',
			width: 0,
			height: 0,
		},
		guide: { position: 'absolute', left: ACROSS.left, width: ACROSS.width, zIndex: -1 },
		/** The room over the capitals and under the baseline, the line's box clipping it. */
		over: {
			bottom: 'var(--font-sans-cap-height)',
			height: '10em',
			backgroundColor: 'var(--interaction-muted)',
		},
		under: { top: 0, height: '10em', backgroundColor: 'var(--interaction-muted)' },
		rule: {
			height: 0,
			borderTopWidth: borderWidth.hairline,
			borderTopStyle: 'solid',
			borderTopColor: 'var(--foreground-subtle)',
		},
		atCapitals: { bottom: 'var(--font-sans-cap-height)' },
		atBaseline: { top: 0 },
		/** Where Chrome puts the capitals, dashed: higher than they stand. */
		atChromeCap: {
			bottom: '1cap',
			borderTopStyle: 'dashed',
			borderTopColor: 'var(--interaction-focus)',
		},
		/** A card as an app draws one, its inset shown as bands on every side. */
		card: {
			position: 'relative',
			display: 'flex',
			flexDirection: 'column',
			alignItems: 'flex-start',
			width: '18rem',
			fontSize: fontSize.body,
			paddingTop: `calc(${INSET} - (1lh - var(--font-sans-cap-height)) / 2)`,
			paddingInline: INSET,
			paddingBottom: INSET,
			borderWidth: borderWidth.hairline,
			borderStyle: 'solid',
			borderColor: 'var(--border-default)',
			borderRadius: radius.xl,
			backgroundColor: 'var(--background-surface)',
			boxShadow: 'var(--shadow-surface)',
			overflow: 'hidden',
		},
		band: { position: 'absolute', backgroundColor: 'var(--interaction-muted)', zIndex: 0 },
		bandTop: { top: 0, left: 0, right: 0, height: INSET },
		bandBottom: { bottom: 0, left: 0, right: 0, height: INSET },
		bandLeft: { top: 0, bottom: 0, left: 0, width: INSET },
		bandRight: { top: 0, bottom: 0, right: 0, width: INSET },
		name: { fontWeight: fontWeight.medium, color: 'var(--foreground-strong)' },
		note: { marginTop: '0.25rem', fontSize: fontSize.caption, color: 'var(--foreground-muted)' },
		actions: {
			display: 'flex',
			alignSelf: 'stretch',
			justifyContent: 'flex-end',
			gap: '0.5rem',
			marginTop: '1.25rem',
		},
		action: {
			display: 'flex',
			alignItems: 'center',
			height: '2rem',
			paddingInline: '0.75rem',
			borderWidth: borderWidth.hairline,
			borderStyle: 'solid',
			borderColor: 'var(--border-default)',
			borderRadius: radius.md,
			fontSize: fontSize.label,
			fontWeight: fontWeight.medium,
			color: 'var(--foreground-strong)',
		},
		/** The capitals and Chrome's reading of them, each beside the line that draws it. */
		key: { display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '1.5rem' },
		entry: { display: 'flex', alignItems: 'center', gap: '0.75rem' },
		swatch: {
			width: '1.5rem',
			height: 0,
			borderTopWidth: borderWidth.hairline,
			borderTopStyle: 'solid',
			borderTopColor: 'var(--foreground-subtle)',
		},
		dashed: { borderTopStyle: 'dashed', borderTopColor: 'var(--interaction-focus)' },
		entryName: {
			fontSize: fontSize.caption,
			fontWeight: fontWeight.medium,
			color: 'var(--foreground-default)',
		},
		value: {
			fontFamily: 'var(--font-mono)',
			fontSize: fontSize.caption,
			color: 'var(--foreground-subtle)',
		},
		figure: { display: 'flex', flexDirection: 'column', alignItems: 'center' },
	});
</script>

<svelte:head>
	<title>Leading</title>
</svelte:head>

<div class="flex flex-col gap-6">
	<Card
		title="The Line"
		rule="A line leaves room over its capitals and under its baseline."
		rfc="0gmzi"
	>
		<Box row="20rem" ratio="1/3">
			<div class={stylex.attrs(styles.line).class}>
				Ledger<span class={stylex.attrs(styles.baseline).class}
					><span class={stylex.attrs(styles.guide, styles.over).class}></span><span
						class={stylex.attrs(styles.guide, styles.under).class}
					></span><span class={stylex.attrs(styles.guide, styles.rule, styles.atCapitals).class}
					></span><span class={stylex.attrs(styles.guide, styles.rule, styles.atBaseline).class}
					></span></span
				>
			</div>
		</Box>
	</Card>

	<Card
		title="Measured to the Ink"
		rule="Boxes are set in to their words' capitals, so the inset reads the same on every side."
		rfc="0gmzi"
	>
		<Box row="20rem" ratio="1/2">
			<div class={stylex.attrs(styles.card).class}>
				<span class={stylex.attrs(styles.band, styles.bandTop).class}></span>
				<span class={stylex.attrs(styles.band, styles.bandBottom).class}></span>
				<span class={stylex.attrs(styles.band, styles.bandLeft).class}></span>
				<span class={stylex.attrs(styles.band, styles.bandRight).class}></span>
				<span class={stylex.attrs(styles.name).class}>Example</span>
				<span class={stylex.attrs(styles.note).class}>A caption under the name</span>
				<div class={stylex.attrs(styles.actions).class}>
					<span class={stylex.attrs(styles.action).class}>Secondary</span>
					<span class={stylex.attrs(styles.action).class}>Primary</span>
				</div>
			</div>
		</Box>
	</Card>

	<Card
		title="Capitals"
		rule="This sans's capitals stand at 0.714em, lower than Chrome reads them."
		rfc="mpy16"
	>
		<Box row="20rem" ratio="1/2">
			<div class={stylex.attrs(styles.figure).class}>
				<div class={stylex.attrs(styles.line).class}>
					HEH<span class={stylex.attrs(styles.baseline).class}
						><span class={stylex.attrs(styles.guide, styles.rule, styles.atCapitals).class}
						></span><span class={stylex.attrs(styles.guide, styles.rule, styles.atChromeCap).class}
						></span><span class={stylex.attrs(styles.guide, styles.rule, styles.atBaseline).class}
						></span></span
					>
				</div>
				<div class={stylex.attrs(styles.key).class}>
					<span class={stylex.attrs(styles.entry).class}>
						<span class={stylex.attrs(styles.swatch).class}></span>
						<span class={stylex.attrs(styles.entryName).class}>Capitals</span>
						<span class={stylex.attrs(styles.value).class}>0.714em</span>
					</span>
					<span class={stylex.attrs(styles.entry).class}>
						<span class={stylex.attrs(styles.swatch, styles.dashed).class}></span>
						<span class={stylex.attrs(styles.entryName).class}>Chrome's cap</span>
						<span class={stylex.attrs(styles.value).class}>0.86em</span>
					</span>
				</div>
			</div>
		</Box>
	</Card>
</div>
