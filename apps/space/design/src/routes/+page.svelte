<script lang="ts">
	/**
	 * The system's home: a card for each category drawn so far, at one proportion, each holding a
	 * few of its own specimens, live: a tip on the pointer, a press that copies. A press anywhere
	 * else on a card enters the category -- the card's title is the link, stretched over it.
	 */
	import * as stylex from '@stylexjs/stylex';
	import { borderWidth, fontSize, fontWeight, radius } from '@canmi/design/scale.stylex';
	import Icon from '@canmi/design/components/icon.svelte';
	import Tooltip from '@canmi/design/components/tooltip.svelte';
	import CheckIcon from '@tabler/icons-svelte-runes/icons/check';
	import { ring } from '@canmi/space-ui/ring';
	import Card from '#lib/specimen/card.svelte';
	import Swatch from '#lib/specimen/swatch.svelte';
	import { Ticks } from '#lib/specimen/ticks.svelte.ts';
	import { SIZES, constOf } from '#lib/specimen/type.ts';
	import { LAYERS, type Category } from '#lib/pages.js';

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

	/** The grays the color card holds, the ground first and the text last. */
	const GRAYS = [
		{ name: 'Base', token: '--background-base' },
		{ name: 'Surface', token: '--background-surface' },
		{ name: 'Muted rank', token: '--interaction-muted' },
		{ name: 'Strong border', token: '--border-strong' },
		{ name: 'Muted text', token: '--foreground-muted' },
		{ name: 'Strong text', token: '--foreground-strong' },
	];

	const ticks = new Ticks();
	const nameOf = (name: string) => name[0]!.toUpperCase() + name.slice(1);

	const styles = stylex.create({
		head: { display: 'flex', flexDirection: 'column', gap: '0.75rem', maxWidth: '44rem' },
		title: {
			fontSize: fontSize.headline,
			fontWeight: fontWeight.semibold,
			letterSpacing: '-0.02em',
			color: 'var(--foreground-strong)',
			textBox: 'trim-start cap alphabetic',
		},
		lede: { fontSize: fontSize.prose, lineHeight: 1.625, color: 'var(--foreground-muted)' },
		layer: {
			fontSize: fontSize.body,
			fontWeight: fontWeight.medium,
			color: 'var(--foreground-default)',
		},
		grid: {
			display: 'grid',
			gridTemplateColumns: 'repeat(auto-fill, minmax(20rem, 1fr))',
			gap: '1.5rem',
		},
		/** Each card at one proportion, whatever its sentence. */
		card: { display: 'grid', aspectRatio: '4 / 3' },
		/** The specimens' ground, the card again on the page's own, filling what the head leaves. */
		stage: {
			display: 'flex',
			flexGrow: 1,
			alignItems: 'center',
			justifyContent: 'center',
			padding: '2rem',
			borderWidth: borderWidth.hairline,
			borderStyle: 'solid',
			borderColor: 'var(--border-default)',
			borderRadius: radius.lg,
			backgroundColor: 'var(--background-base)',
		},
		/** A specimen over the card's link, so a press on it is its own, not the card's. */
		above: { position: 'relative', zIndex: 2 },
		row: { display: 'flex', alignItems: 'center', gap: '0.75rem' },
		/** Rings drawn at rest, far enough apart that neither meets the other. */
		apart: { gap: '1.5rem' },
		ladder: { display: 'flex', alignItems: 'baseline', gap: '0.875rem' },
		glyphs: {
			padding: 0,
			borderWidth: 0,
			backgroundColor: 'transparent',
			fontWeight: fontWeight.medium,
			color: 'var(--foreground-strong)',
			cursor: 'copy',
		},
		button: {
			display: 'flex',
			alignItems: 'center',
			height: '2rem',
			paddingInline: '0.75rem',
			borderWidth: borderWidth.hairline,
			borderStyle: 'solid',
			borderColor: 'var(--border-default)',
			borderRadius: radius.md,
			backgroundColor: 'transparent',
			fontSize: fontSize.label,
			fontWeight: fontWeight.medium,
			color: 'var(--foreground-strong)',
		},
		words: {
			padding: 0,
			borderWidth: 0,
			backgroundColor: 'transparent',
			fontSize: fontSize.title,
			fontWeight: fontWeight.medium,
			color: 'var(--foreground-strong)',
		},
	});
</script>

<svelte:head>
	<title>Design</title>
</svelte:head>

{#snippet specimens(category: Category)}
	{#if category.slug === 'color'}
		<div class={stylex.attrs(styles.row).class}>
			{#each GRAYS as gray (gray.token)}
				<span class={stylex.attrs(styles.above).class}>
					<Swatch name={gray.name} token={gray.token} size="2.25rem" />
				</span>
			{/each}
		</div>
	{:else if category.slug === 'typography'}
		<div class={stylex.attrs(styles.ladder).class}>
			{#each SIZES as size (size.name)}
				<span class={stylex.attrs(styles.above).class}>
					<Tooltip label={nameOf(size.name)} icon={ticks.has(size.name) ? CheckIcon : undefined}>
						<button
							type="button"
							aria-label="Copy {constOf(size)}"
							class={stylex.attrs(styles.glyphs, ring.host).class}
							style:font-size="{size.rem}rem"
							onclick={() => ticks.write(constOf(size), size.name)}
						>
							<span class={stylex.attrs(ring.ink).class}>Aa</span>
						</button>
					</Tooltip>
				</span>
			{/each}
		</div>
	{:else if category.slug === 'states'}
		<div class={stylex.attrs(styles.row, styles.apart).class}>
			<span class={stylex.attrs(styles.above).class}>
				<Tooltip label="Control">
					<button
						type="button"
						class={stylex.attrs(styles.button, ring.control, ring.shownControl).class}
						>Button</button
					>
				</Tooltip>
			</span>
			<span class={stylex.attrs(styles.above).class}>
				<Tooltip label="Words">
					<button type="button" class={stylex.attrs(styles.words, ring.host, ring.shownWords).class}
						><span class={stylex.attrs(ring.ink).class}>Focus</span></button
					>
				</Tooltip>
			</span>
		</div>
	{/if}
{/snippet}

<div class="flex flex-col gap-8">
	<header class={stylex.attrs(styles.head).class}>
		<h1 class={stylex.attrs(styles.title).class}>Design</h1>
		<p class={stylex.attrs(styles.lede).class}>
			The colors, type and states the console and canmi.app are built from, each page drawn by the
			code it describes.
		</p>
	</header>

	{#each SECTIONS as layer (layer.label)}
		<section class="flex flex-col gap-4">
			<h2 class={stylex.attrs(styles.layer).class}>{layer.label}</h2>
			<div class={stylex.attrs(styles.grid).class}>
				{#each layer.categories as category (category.slug)}
					<div class={stylex.attrs(styles.card).class}>
						<Card title={category.label} rule={RULES[category.slug] ?? ''} href={category.href}>
							<div class={stylex.attrs(styles.stage).class}>
								{@render specimens(category)}
							</div>
						</Card>
					</div>
				{/each}
			</div>
		</section>
	{/each}
</div>
