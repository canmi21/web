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
			rule: 'The page stands on the base, and a region on the surface.',
			rfc: 'c656n',
			reading: 'oklch',
			tiles: [
				{ name: 'Base', token: '--background-base' },
				{ name: 'Surface', token: '--background-surface' },
			],
		},
		{
			label: 'Interaction',
			rule: 'A hover, a choice or a fill is one of four ranks laid over a ground.',
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
			rule: 'A line between two things is one of three borders.',
			rfc: 'h27v0',
			reading: 'text',
			tiles: [
				{ name: 'Subtle', token: '--border-subtle' },
				{ name: 'Default', token: '--border-default' },
				{ name: 'Strong', token: '--border-strong' },
			],
		},
	];

	/** The first card's tile, the gap between tiles in a group and between groups, in rem. */
	const TILE = 4.5;
	const WITHIN = 0.75;
	const BETWEEN = 2.5;
	const TILES = GROUPS.flatMap((group) => group.tiles).length;
	/** Its row at full width, the measure the box's space above and below is worked out against. */
	const ROW = TILES * TILE + (TILES - GROUPS.length) * WITHIN + (GROUPS.length - 1) * BETWEEN;

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
		/** The groups apart by more than the tiles in one. */
		groups: {
			display: 'flex',
			flexWrap: 'wrap',
			justifyContent: 'center',
			columnGap: `${BETWEEN}rem`,
			rowGap: '1.5rem',
		},
		group: { display: 'flex', gap: `${WITHIN}rem` },
		/** A group's own card: each tile over its name and its value. */
		named: { columnGap: '2rem', rowGap: '1.5rem' },
		item: { display: 'flex', flexDirection: 'column', gap: '0.625rem' },
		name: {
			fontSize: fontSize.body,
			fontWeight: fontWeight.medium,
			color: 'var(--foreground-strong)',
		},
		value: {
			fontFamily: 'var(--font-mono)',
			fontSize: fontSize.caption,
			color: 'var(--foreground-muted)',
		},
	});
</script>

<svelte:head>
	<title>Materials</title>
</svelte:head>

<div class="flex flex-col gap-6">
	<Card title="Materials" rule="Every gray on a page is one of these nine." rfc="ic4cd">
		<Box row="{ROW}rem" ratio="2/3">
			<div class={stylex.attrs(styles.groups).class}>
				{#each GROUPS as group (group.label)}
					<div class={stylex.attrs(styles.group).class}>
						{#each group.tiles as tile (tile.token)}
							<Swatch name="{group.label} {tile.name}" token={tile.token} size="{TILE}rem" />
						{/each}
					</div>
				{/each}
			</div>
		</Box>
	</Card>

	{#each GROUPS as group (group.label)}
		<Card title={group.label} rule={group.rule} rfc={group.rfc}>
			<div class={stylex.attrs(styles.box, styles.named).class}>
				{#each group.tiles as tile (tile.token)}
					<div class={stylex.attrs(styles.item).class}>
						<Swatch name={tile.name} token={tile.token} size="6.5rem" />
						<span class={stylex.attrs(styles.name).class}>{tile.name}</span>
						{#if theme}
							<span class={stylex.attrs(styles.value).class}>
								{readOf(valueOf(tile.token, theme) ?? '', group.reading)}
							</span>
						{/if}
					</div>
				{/each}
			</div>
		</Card>
	{/each}
</div>
