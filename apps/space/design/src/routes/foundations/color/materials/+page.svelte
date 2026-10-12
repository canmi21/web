<script lang="ts">
	/**
	 * Every neutral a page is built of, in the page's theme: all of them together with nothing said,
	 * then each group on a card of its own, with when it is used and each value under its tile, in
	 * the terms it was chosen in: a ground its oklch, a rank or a border the strongest text's oklch
	 * and how much of it is laid, a text tier its APCA contrast on the surface.
	 */
	import * as stylex from '@stylexjs/stylex';
	import { fontSize, fontWeight } from '@canmi/design/scale.stylex';
	import { currentTheme, type Theme } from '@canmi/design/theme';
	import { page } from '$app/state';
	import { untrack } from 'svelte';
	import Box from '#lib/specimen/box.svelte';
	import Card from '#lib/specimen/card.svelte';
	import { contrastOf } from '#lib/specimen/apca.ts';
	import { valueOf } from '#lib/specimen/mono.ts';
	import { frame } from '#lib/specimen/frame.stylex.ts';
	import Swatch from '#lib/specimen/swatch.svelte';

	/**
	 * What a group's values are read as: a ground's oklch, the text's and how much is laid, or a
	 * text tier's contrast on the surface.
	 */
	type Reading = 'oklch' | 'text' | 'contrast';

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
			rule: 'The base and the surface are two lightnesses of one gray, the surface the lighter.',
			rfc: 'c656n',
			reading: 'oklch',
			tiles: [
				{ name: 'Base', token: '--background-base' },
				{ name: 'Surface', token: '--background-surface' },
			],
		},
		{
			label: 'Interaction',
			rule: 'Ranks are the text color at a low opacity, laid over the ground below.',
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
			rule: 'Borders are the text color too, at a little more opacity than the ranks.',
			rfc: 'h27v0',
			reading: 'text',
			tiles: [
				{ name: 'Subtle', token: '--border-subtle' },
				{ name: 'Default', token: '--border-default' },
				{ name: 'Strong', token: '--border-strong' },
			],
		},
		{
			label: 'Foreground',
			rule: 'Each text tier is set by its APCA contrast on the surface, the same in both themes.',
			rfc: 'yvws0',
			reading: 'contrast',
			tiles: [
				{ name: 'Subtle', token: '--foreground-subtle' },
				{ name: 'Muted', token: '--foreground-muted' },
				{ name: 'Default', token: '--foreground-default' },
				{ name: 'Strong', token: '--foreground-strong' },
			],
		},
	];

	/** The first card's tiles, every one, and their size and the one gap between any two, in rem. */
	const ALL = GROUPS.flatMap((group) =>
		group.tiles.map((tile) => ({ ...tile, name: `${group.label} ${tile.name}` })),
	);
	const TILE = 4.5;
	const GAP = 0.75;
	/**
	 * Two rows, the first the longer by one at most: a row at full width is the measure the box's
	 * space above and below is worked out against.
	 */
	const ACROSS = Math.ceil(ALL.length / 2);
	const ROW = ACROSS * TILE + (ACROSS - 1) * GAP;

	/**
	 * A group's tiles and the gap between two, in rem, and the row the longest group makes: every
	 * group's box is measured against it, so the four stand at one height.
	 */
	const NAMED = 8.5;
	const NAMED_GAP = 2;
	const LONGEST = Math.max(...GROUPS.map((group) => group.tiles.length));
	const NAMED_ROW = LONGEST * NAMED + (LONGEST - 1) * NAMED_GAP;
	/** How far a tile's name and value hang below it, in rem, the gap to the tile included. */
	const HANG = 3.25;

	/**
	 * A value in a group's terms: as CSS writes it, for the text its alpha as a percentage, or for a
	 * text tier its contrast, as APCA writes it.
	 */
	function readOf(token: string, theme: Theme, reading: Reading): string {
		if (reading === 'contrast') return `Lc ${Math.round(contrastOf(token, theme))}`;
		const value = valueOf(token, theme) ?? '';
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
		/** Every tile at one gap, no group told from another: what they are is the cards' below. */
		all: { display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: `${GAP}rem` },
		/** No wider than a row of `ACROSS`, so the tiles fall into two rows. */
		rows: { maxWidth: 'var(--row)' },
		/** A group's own card: each tile over its name and its value. */
		named: {
			display: 'flex',
			flexWrap: 'wrap',
			justifyContent: 'center',
			columnGap: `${NAMED_GAP}rem`,
			rowGap: `${HANG + 1.5}rem`,
		},
		/**
		 * The tile, and hung under it its name and value, starting where the tile's color starts: the
		 * tile alone is what the box centers.
		 */
		item: { position: 'relative', display: 'flex' },
		/** A tile's name and its value, closer to each other than to the tile. */
		caption: {
			display: 'flex',
			flexDirection: 'column',
			gap: '0.125rem',
			position: 'absolute',
			insetBlockStart: 'calc(100% + 0.625rem)',
			insetInlineStart: 0,
			paddingInlineStart: frame.well,
			whiteSpace: 'nowrap',
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
	<Card title="Every Gray" rule="All neutrals on a page come from this set of grays." rfc="ic4cd">
		<Box row="{ROW}rem" ratio="2/3">
			<div class={stylex.attrs(styles.all, styles.rows).class} style:--row="{ROW}rem">
				{#each ALL as tile (tile.token)}
					<Swatch name={tile.name} token={tile.token} size="{TILE}rem" reach="{GAP / 2}rem" />
				{/each}
			</div>
		</Box>
	</Card>

	{#each GROUPS as group (group.label)}
		<Card title={group.label} rule={group.rule} rfc={group.rfc}>
			<Box row="{NAMED_ROW}rem" ratio="1/2" hang="{HANG}rem">
				<div class={stylex.attrs(styles.named).class}>
					{#each group.tiles as tile (tile.token)}
						<div class={stylex.attrs(styles.item).class}>
							<Swatch name={tile.name} token={tile.token} size="{NAMED}rem" tip={false} />
							<div class={stylex.attrs(styles.caption).class}>
								<span class={stylex.attrs(styles.name).class}>{tile.name}</span>
								{#if theme}
									<span class={stylex.attrs(styles.value).class}>
										{readOf(tile.token, theme, group.reading)}
									</span>
								{/if}
							</div>
						</div>
					{/each}
				</div>
			</Box>
		</Card>
	{/each}
</div>
