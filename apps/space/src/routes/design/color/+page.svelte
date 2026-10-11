<script lang="ts">
	/**
	 * The console's map card, its container alone -- the surface, a hairline border, its corners and
	 * its shadow, as `surfaces.card` in the console's src/lib/style.ts draws it -- with a title and a
	 * sentence as its head, and a specimen box inside it: the card again, on the page's own ground,
	 * to see the two nested.
	 */
	import * as stylex from '@stylexjs/stylex';
	import { borderWidth, fontWeight, lineHeight, radius } from '@canmi/design/scale.stylex';

	const styles = stylex.create({
		card: {
			display: 'flex',
			minWidth: 0,
			flexDirection: 'column',
			borderWidth: borderWidth.hairline,
			borderStyle: 'solid',
			borderColor: 'var(--border-default)',
			borderRadius: radius.xl,
			backgroundColor: 'var(--background-surface)',
			boxShadow: 'var(--shadow-surface)',
		},
		/** The console's card head: its inset and its title's type. */
		head: {
			display: 'flex',
			flexDirection: 'column',
			gap: '0.25rem',
			paddingInline: '1.25rem',
			paddingTop: '1rem',
		},
		title: {
			fontSize: '1.5rem', // unnamed: as the console's title
			fontWeight: fontWeight.semibold,
			letterSpacing: '-0.02em',
			color: 'var(--foreground-strong)',
		},
		sentence: {
			fontSize: '1rem', // unnamed: the reader's own size, for a sentence to read
			lineHeight: lineHeight.relaxed,
			color: 'var(--foreground-muted)',
		},
		/** The console's card body inset. */
		body: {
			display: 'flex',
			flexGrow: 1,
			flexDirection: 'column',
			paddingInline: '1.25rem',
			paddingTop: '0.75rem',
			paddingBottom: '1.25rem',
		},
		/** The card again, on the page's own ground. */
		box: {
			height: '10rem',
			borderWidth: borderWidth.hairline,
			borderStyle: 'solid',
			borderColor: 'var(--border-default)',
			borderRadius: radius.xl,
			backgroundColor: 'var(--background-base)',
			boxShadow: 'var(--shadow-surface)',
		},
	});
</script>

<svelte:head>
	<title>Color</title>
</svelte:head>

<section class={stylex.attrs(styles.card).class}>
	<header class={stylex.attrs(styles.head).class}>
		<h2 class={stylex.attrs(styles.title).class}>Example title</h2>
		<p class={stylex.attrs(styles.sentence).class}>An example sentence, kept short.</p>
	</header>
	<div class={stylex.attrs(styles.body).class}>
		<div class={stylex.attrs(styles.box).class}></div>
	</div>
</section>
