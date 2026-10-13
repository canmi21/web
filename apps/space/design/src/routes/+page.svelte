<script lang="ts">
	/**
	 * The system's home: a card for each category drawn so far, as the pages under it are laid,
	 * each holding a glimpse of what it shows and its pages to enter. The glimpses are drawn from
	 * the style and the scale as the pages are, and stand still: what they show is a page away.
	 */
	import * as stylex from '@stylexjs/stylex';
	import { borderWidth, fontSize, fontWeight, radius } from '@canmi/design/scale.stylex';
	import { descends, ring } from '@canmi/space-ui/ring';
	import Box from '#lib/specimen/box.svelte';
	import Card from '#lib/specimen/card.svelte';
	import { LAYERS, type Category } from '#lib/pages.js';
	import { SIZES } from '#lib/specimen/type.ts';

	/** Each category drawn so far, by the layer holding it. */
	const SECTIONS = LAYERS.map((layer) => ({
		...layer,
		categories: layer.categories.filter((one) => one.href),
	})).filter((layer) => layer.categories.length > 0);

	/** What each category's card says it holds, in a card's own voice. */
	const RULES: Record<string, string> = {
		color: 'Every gray and hue a page is drawn in, in both themes.',
		typography: 'The sizes words are set at, and the room a line leaves around them.',
		states: 'How a thing shows that the keyboard is on it.',
	};

	/** The grays the color card glimpses, the ground first and the text last. */
	const GRAYS = [
		'--background-base',
		'--background-surface',
		'--interaction-muted',
		'--interaction-strong',
		'--border-strong',
		'--foreground-subtle',
		'--foreground-muted',
		'--foreground-strong',
	];

	/** The row every card's glimpse is measured against, so the cards stand at one height. */
	const ROW = 18;

	const styles = stylex.create({
		head: { display: 'flex', flexDirection: 'column', gap: '0.5rem', maxWidth: '48rem' },
		title: {
			fontSize: fontSize.headline,
			fontWeight: fontWeight.semibold,
			letterSpacing: '-0.02em',
			color: 'var(--foreground-strong)',
		},
		lede: { fontSize: fontSize.prose, lineHeight: 1.625, color: 'var(--foreground-muted)' },
		layer: {
			fontSize: fontSize.body,
			fontWeight: fontWeight.medium,
			color: 'var(--foreground-default)',
		},
		grid: {
			display: 'grid',
			gridTemplateColumns: 'repeat(auto-fill, minmax(22rem, 1fr))',
			gap: '1.5rem',
		},
		/** A strip of the grays, ringed as one, each cell its gray. */
		strip: {
			display: 'grid',
			gridTemplateColumns: `repeat(${GRAYS.length}, 2rem)`,
			height: '2rem',
			overflow: 'hidden',
			borderRadius: radius.lg,
			boxShadow: `0 0 0 ${borderWidth.hairline} var(--border-default)`,
		},
		ladder: {
			display: 'flex',
			alignItems: 'baseline',
			gap: '0.875rem',
			fontWeight: fontWeight.medium,
			color: 'var(--foreground-strong)',
		},
		states: { display: 'flex', alignItems: 'center', gap: '1.25rem' },
		button: {
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
		words: {
			fontSize: fontSize.title,
			fontWeight: fontWeight.medium,
			color: 'var(--foreground-strong)',
		},
		/** The category's pages, each a link by its words. */
		pages: {
			display: 'flex',
			flexWrap: 'wrap',
			columnGap: '1.25rem',
			rowGap: '0.5rem',
			marginTop: '1.25rem',
		},
		page: {
			fontSize: fontSize.body,
			color: { default: 'var(--foreground-muted)', ':hover': 'var(--foreground-strong)' },
		},
	});
</script>

<svelte:head>
	<title>Design</title>
</svelte:head>

{#snippet glimpse(category: Category)}
	{#if category.slug === 'color'}
		<div class={stylex.attrs(styles.strip).class}>
			{#each GRAYS as token (token)}
				<span style:background-color="var({token})"></span>
			{/each}
		</div>
	{:else if category.slug === 'typography'}
		<div class={stylex.attrs(styles.ladder).class}>
			{#each SIZES as size (size.name)}
				<span style:font-size="{size.rem}rem">Aa</span>
			{/each}
		</div>
	{:else if category.slug === 'states'}
		<div class={stylex.attrs(styles.states).class}>
			<span class={stylex.attrs(styles.button, ring.control, ring.shownControl).class}>Button</span>
			<span class={stylex.attrs(styles.words, ring.host, ring.shownWords).class}
				><span class={stylex.attrs(ring.ink).class}>Focus</span></span
			>
		</div>
	{/if}
{/snippet}

<div class="flex flex-col gap-8">
	<header class={stylex.attrs(styles.head).class}>
		<h1 class={stylex.attrs(styles.title).class}>Design</h1>
		<p class={stylex.attrs(styles.lede).class}>
			One set of names every component reads, a style that gives each a value in light and in dark,
			and a scale no style changes. Everything here is drawn from the code itself.
		</p>
	</header>

	{#each SECTIONS as layer (layer.label)}
		<section class="flex flex-col gap-4">
			<h2 class={stylex.attrs(styles.layer).class}>{layer.label}</h2>
			<div class={stylex.attrs(styles.grid).class}>
				{#each layer.categories as category (category.slug)}
					<Card title={category.label} rule={RULES[category.slug] ?? ''}>
						<Box row="{ROW}rem" ratio="1/3">
							{@render glimpse(category)}
						</Box>
						<nav aria-label={category.label} class={stylex.attrs(styles.pages).class}>
							{#each category.pages.filter((one) => one.href) as one (one.label)}
								<a href={one.href} class={stylex.attrs(styles.page, ring.host).class}
									><span class={stylex.attrs(ring.ink, descends(one.label) && ring.descends).class}
										>{one.label}</span
									></a
								>
							{/each}
						</nav>
					</Card>
				{/each}
			</div>
		</section>
	{/each}
</div>
