<script lang="ts">
	/**
	 * The system's hues on a card, under a title and a sentence: each hue a pair of capsules, the
	 * light's then the dark's, the wells in the page's theme and each hue held in its own.
	 */
	import * as stylex from '@stylexjs/stylex';
	import { borderWidth, fontWeight, lineHeight, radius } from '@canmi/design/scale.stylex';
	import ThemeScope from '@canmi/design/components/theme-scope.svelte';

	const HUES = [
		{ name: 'Information', token: '--status-info' },
		{ name: 'Focus', token: '--interaction-focus' },
		{ name: 'Success', token: '--status-success' },
		{ name: 'Warning', token: '--status-warning' },
		{ name: 'Critical', token: '--status-critical' },
	] as const;

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
		head: {
			display: 'flex',
			flexDirection: 'column',
			gap: '0.25rem',
			paddingInline: '1.25rem',
			paddingTop: '1rem',
		},
		title: {
			fontSize: '1.5rem', // unnamed: a page title
			fontWeight: fontWeight.semibold,
			letterSpacing: '-0.02em',
			color: 'var(--foreground-strong)',
		},
		sentence: {
			fontSize: '1rem', // unnamed: the reader's own size, for a sentence to read
			lineHeight: lineHeight.relaxed,
			color: 'var(--foreground-muted)',
		},
		body: {
			display: 'flex',
			flexGrow: 1,
			flexDirection: 'column',
			paddingInline: '1.25rem',
			paddingTop: '0.75rem',
			paddingBottom: '1.25rem',
		},
		/** The card again, on the page's own ground, the hues standing in it. */
		box: {
			display: 'flex',
			flexWrap: 'wrap',
			justifyContent: 'center',
			gap: '1.5rem',
			paddingBlock: '3rem',
			borderWidth: borderWidth.hairline,
			borderStyle: 'solid',
			borderColor: 'var(--border-default)',
			borderRadius: radius.xl,
			backgroundColor: 'var(--background-base)',
		},
		/** A hue's two capsules, closer to each other than to the next hue's. */
		pair: { display: 'flex', gap: '0.75rem' },
		/** A capsule's well: the surface, ringed, the hue inset from it. */
		well: {
			display: 'flex',
			flexShrink: 0,
			width: '2.5rem',
			height: '10rem',
			padding: '0.5rem',
			borderRadius: radius.full,
			backgroundColor: 'var(--background-surface)',
			boxShadow: `0 0 0 ${borderWidth.hairline} var(--border-default)`,
		},
		/** The hue, ringed inside its own edge so a pale one still has one. */
		hue: {
			flexGrow: 1,
			borderRadius: radius.full,
			outlineWidth: borderWidth.hairline,
			outlineStyle: 'solid',
			outlineColor: 'var(--border-default)',
			outlineOffset: `calc(-1 * ${borderWidth.hairline})`,
		},
	});
</script>

<svelte:head>
	<title>Color</title>
</svelte:head>

<section class={stylex.attrs(styles.card).class}>
	<header class={stylex.attrs(styles.head).class}>
		<h2 class={stylex.attrs(styles.title).class}>Hues</h2>
		<p class={stylex.attrs(styles.sentence).class}>
			Each at its purest, the light's then the dark's, a step deeper.
		</p>
	</header>
	<div class={stylex.attrs(styles.body).class}>
		<div class={stylex.attrs(styles.box).class}>
			{#each HUES as hue (hue.token)}
				<div class={stylex.attrs(styles.pair).class}>
					{#each ['light', 'dark'] as const as theme (theme)}
						<div class={stylex.attrs(styles.well).class} title="{hue.name}, {theme}">
							<ThemeScope {theme}>
								<span
									role="img"
									aria-label="{hue.name}, {theme}"
									class={stylex.attrs(styles.hue).class}
									style:background-color="var({hue.token})"
								></span>
							</ThemeScope>
						</div>
					{/each}
				</div>
			{/each}
		</div>
	</div>
</section>
