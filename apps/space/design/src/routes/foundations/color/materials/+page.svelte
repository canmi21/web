<script lang="ts">
	/**
	 * Every neutral a page is built of, in the page's theme: all nine together with nothing said,
	 * then each group on a card of its own, with when it is used and each value under its tile, in
	 * the terms it was chosen in: a ground its oklch, a rank or a border the strongest text's oklch
	 * and how much of it is laid.
	 */
	import * as stylex from '@stylexjs/stylex';
	import { borderWidth, fontSize, fontWeight, radius } from '@canmi/design/scale.stylex';
	import { currentTheme, type Theme } from '@canmi/design/theme';
	import { page } from '$app/state';
	import { untrack } from 'svelte';
	import Box from '#lib/specimen/box.svelte';
	import Card from '#lib/specimen/card.svelte';
	import { valueOf } from '#lib/specimen/mono.ts';
	import { frame } from '#lib/specimen/frame.stylex.ts';
	import Swatch from '#lib/specimen/swatch.svelte';

	/** What a group's values are read as: a ground's oklch, or the text's and how much is laid. */
	type Reading = 'oklch' | 'text';

	/** Each group named as its tokens are, with the rule for when it is used and its RFC. */
	const GROUPS: readonly {
		label: string;
		rule: string;
		rfc: string;
		reading: Reading;
		tiles: readonly { name: string; token: string }[];
	}[] = [
		{
			label: 'Background',
			rule: 'The page rests on the base, and each region on the surface a step above it.',
			rfc: 'c656n',
			reading: 'oklch',
			tiles: [
				{ name: 'Base', token: '--background-base' },
				{ name: 'Surface', token: '--background-surface' },
			],
		},
		{
			label: 'Interaction',
			rule: 'Hover, selection and fill are ranks of the text, laid thin over a ground.',
			rfc: 'ic4cd',
			reading: 'text',
			tiles: [
				{ name: 'Subtle', token: '--interaction-subtle' },
				{ name: 'Muted', token: '--interaction-muted' },
				{ name: 'Default', token: '--interaction-default' },
				{ name: 'Strong', token: '--interaction-strong' },
			],
		},
		{
			label: 'Border',
			rule: "Borders set one thing apart from the next, each the text's own color laid thin.",
			rfc: 'h27v0',
			reading: 'text',
			tiles: [
				{ name: 'Subtle', token: '--border-subtle' },
				{ name: 'Default', token: '--border-default' },
				{ name: 'Strong', token: '--border-strong' },
			],
		},
	];

	/** The first card's tiles, every one, and their size and the one gap between any two, in rem. */
	const ALL = GROUPS.flatMap((group) =>
		group.tiles.map((tile) => ({ ...tile, name: `${group.label} ${tile.name}` })),
	);
	const TILE = 4.5;
	const GAP = 0.75;
	/** Its row at full width, the measure the box's space above and below is worked out against. */
	const ROW = ALL.length * TILE + (ALL.length - 1) * GAP;

	/** A value in a group's terms, as CSS writes it: for the text, its alpha as a percentage. */
	function readOf(value: string, reading: Reading): string {
		const [l = '', c = '', h = '', alpha] =
			/oklch\(([\d.]+) ([\d.]+) ([\d.]+)(?: \/ ([\d.]+))?\)/.exec(value)?.slice(1) ?? [];
		if (reading === 'oklch') return `oklch(${l} ${c} ${h})`;
		return `oklch(${l} ${c} ${h} / ${Math.round(Number(alpha ?? 1) * 1000) / 10}%)`;
	}

	/**
	 * The page's theme: the server's, from the reader's cookie, then the root's mark, followed as it
	 * moves. Each value is worked out from the style's own files, so nothing waits on a paint.
	 */
	let theme = $state<Theme | undefined>(untrack(() => page.data.theme));
	$effect(() => {
		const root = document.documentElement;
		theme = currentTheme(root);
		const watch = new MutationObserver(() => (theme = currentTheme(root)));
		watch.observe(root, { attributes: true, attributeFilter: ['data-theme'] });
		return () => watch.disconnect();
	});

	const styles = stylex.create({
		/** The card again, on the page's own ground, what it shows standing in its middle. */
		box: {
			display: 'flex',
			flexWrap: 'wrap',
			justifyContent: 'center',
			paddingBlock: '3rem',
			paddingInline: '2rem',
			borderWidth: borderWidth.hairline,
			borderStyle: 'solid',
			borderColor: 'var(--border-default)',
			borderRadius: radius.lg,
			backgroundColor: 'var(--background-base)',
		},
		/** Every tile at one gap, no group told from another: what they are is the cards' below. */
		all: { display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: `${GAP}rem` },
		/** A group's own card: each tile over its name and its value. */
		named: { columnGap: '2rem', rowGap: '1.5rem' },
		/** The tile, and under it its name and value, starting where the tile's color starts. */
		item: { display: 'flex', flexDirection: 'column', gap: '0.625rem' },
		/** A tile's name and its value, closer to each other than to the tile. */
		caption: {
			display: 'flex',
			flexDirection: 'column',
			gap: '0.125rem',
			paddingInlineStart: frame.well,
		},
		name: {
			fontSize: fontSize.body,
			fontWeight: fontWeight.medium,
			color: 'var(--foreground-strong)',
		},
		value: {
			fontFamily: 'var(--font-mono)',
			// A space half a cell, the rest of the mono's cells kept whole.
			wordSpacing: '-0.5ch',
			fontSize: fontSize.caption,
			color: 'var(--foreground-muted)',
		},
	});
</script>

<svelte:head>
	<title>Materials</title>
</svelte:head>

<div class="flex flex-col gap-6">
	<Card title="Materials" rule="A fixed set of grays makes up every neutral on a page." rfc="ic4cd">
		<Box row="{ROW}rem" ratio="2/3">
			<div class={stylex.attrs(styles.all).class}>
				{#each ALL as tile (tile.token)}
					<Swatch name={tile.name} token={tile.token} size="{TILE}rem" reach="{GAP / 2}rem" />
				{/each}
			</div>
		</Box>
	</Card>

	{#each GROUPS as group (group.label)}
		<Card title={group.label} rule={group.rule} rfc={group.rfc}>
			<div class={stylex.attrs(styles.box, styles.named).class}>
				{#each group.tiles as tile (tile.token)}
					<div class={stylex.attrs(styles.item).class}>
						<Swatch name={tile.name} token={tile.token} size="8.5rem" tip={false} />
						<div class={stylex.attrs(styles.caption).class}>
							<span class={stylex.attrs(styles.name).class}>{tile.name}</span>
							{#if theme}
								<span class={stylex.attrs(styles.value).class}>
									{readOf(valueOf(tile.token, theme) ?? '', group.reading)}
								</span>
							{/if}
						</div>
					</div>
				{/each}
			</div>
		</Card>
	{/each}
</div>
