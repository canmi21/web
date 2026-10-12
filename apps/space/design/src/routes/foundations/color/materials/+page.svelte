<script lang="ts">
	/**
	 * Every neutral a page is built of, in the page's theme: the two grounds, the four ranks of the
	 * text laid thin, the three borders, a row each. A tile is named by its tip and copies its token
	 * as code reads it, ticked in the strongest text. Each writes its value in the page's theme, in
	 * the terms it was chosen in: a ground its oklch, a rank or a border the strongest text's oklch
	 * and how much of it is laid.
	 */
	import * as stylex from '@stylexjs/stylex';
	import { borderWidth, fontSize, fontWeight, radius } from '@canmi/design/scale.stylex';
	import Icon from '@canmi/design/components/icon.svelte';
	import Tooltip from '@canmi/design/components/tooltip.svelte';
	import CheckIcon from '@tabler/icons-svelte-runes/icons/check';
	import { SvelteMap } from 'svelte/reactivity';
	import { currentTheme, type Theme } from '@canmi/design/theme';
	import { page } from '$app/state';
	import { untrack } from 'svelte';
	import Card from '#lib/specimen/card.svelte';
	import { valueOf } from '#lib/specimen/mono.ts';

	/** What a row's values are read as: a ground's oklch, or the text's and the share of it laid. */
	type Reading = 'oklch' | 'text';

	const ROWS: readonly {
		label: string;
		reading: Reading;
		tiles: readonly { name: string; token: string }[];
	}[] = [
		{
			label: 'Grounds',
			reading: 'oklch',
			tiles: [
				{ name: 'Base', token: '--background-base' },
				{ name: 'Surface', token: '--background-surface' },
			],
		},
		{
			label: 'Ranks',
			reading: 'text',
			tiles: [
				{ name: 'Subtle', token: '--interaction-subtle' },
				{ name: 'Muted', token: '--interaction-muted' },
				{ name: 'Default', token: '--interaction-default' },
				{ name: 'Strong', token: '--interaction-strong' },
			],
		},
		{
			label: 'Borders',
			reading: 'text',
			tiles: [
				{ name: 'Subtle', token: '--border-subtle' },
				{ name: 'Default', token: '--border-default' },
				{ name: 'Strong', token: '--border-strong' },
			],
		},
	];

	/** A value in a row's terms, as CSS writes it: for the text, its alpha as a percentage. */
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

	/** The tiles ticked, each with its own clock: a copy ticks one without clearing another. */
	const ticked = new SvelteMap<string, ReturnType<typeof setTimeout>>();

	async function copy(token: string) {
		await navigator.clipboard.writeText(`var(${token})`);
		clearTimeout(ticked.get(token));
		ticked.set(
			token,
			setTimeout(() => ticked.delete(token), 1200),
		);
	}

	const appear = stylex.keyframes({
		from: { opacity: 0, transform: 'scale(0.6)' },
		to: { opacity: 1, transform: 'scale(1)' },
	});

	const styles = stylex.create({
		/** The card again, on the page's own ground, the rows standing in it. */
		box: {
			display: 'grid',
			gridTemplateColumns: 'auto 1fr',
			alignItems: 'center',
			columnGap: '2rem',
			rowGap: '1.5rem',
			padding: '2.5rem',
			borderWidth: borderWidth.hairline,
			borderStyle: 'solid',
			borderColor: 'var(--border-default)',
			borderRadius: radius.xl,
			backgroundColor: 'var(--background-base)',
		},
		label: {
			fontSize: fontSize.body,
			fontWeight: fontWeight.medium,
			color: 'var(--foreground-muted)',
		},
		row: { display: 'flex', flexWrap: 'wrap', gap: '0.75rem' },
		tile: {
			position: 'relative',
			display: 'flex',
			flexDirection: 'column',
			justifyContent: 'flex-end',
			alignItems: 'flex-start',
			gap: '0.125rem',
			width: '11rem',
			height: '7.5rem',
			padding: '0.75rem',
			borderWidth: borderWidth.hairline,
			borderStyle: 'solid',
			borderColor: 'var(--border-default)',
			borderRadius: radius.lg,
			color: 'var(--foreground-strong)',
			cursor: 'copy',
		},
		value: {
			fontFamily: 'var(--font-mono)',
			fontSize: fontSize.caption,
			color: 'var(--foreground-muted)',
		},
		tick: {
			position: 'absolute',
			inset: 0,
			alignItems: 'center',
			justifyContent: 'center',
			display: 'flex',
			pointerEvents: 'none',
			animationName: appear,
			animationDuration: '150ms',
			animationTimingFunction: 'ease-out',
		},
	});
</script>

<svelte:head>
	<title>Materials</title>
</svelte:head>

<Card
	title="Materials"
	rule="A page is built of two grounds, four ranks of the text laid thin, and three borders, and nothing else."
	rfc="ic4cd"
>
	<div class={stylex.attrs(styles.box).class}>
		{#each ROWS as row (row.label)}
			<span class={stylex.attrs(styles.label).class}>{row.label}</span>
			<div class={stylex.attrs(styles.row).class}>
				{#each row.tiles as tile (tile.token)}
					<Tooltip label={tile.name}>
						<button
							type="button"
							aria-label="Copy {tile.token}, {row.label} {tile.name}"
							class={stylex.attrs(styles.tile).class}
							style:background-color="var({tile.token})"
							onclick={() => copy(tile.token)}
						>
							{#if theme}
								<span class={stylex.attrs(styles.value).class}>
									{readOf(valueOf(tile.token, theme) ?? '', row.reading)}
								</span>
							{/if}
							{#if ticked.has(tile.token)}
								<span class={stylex.attrs(styles.tick).class}>
									<Icon icon={CheckIcon} size={20} stroke={3} />
								</span>
							{/if}
						</button>
					</Tooltip>
				{/each}
			</div>
		{/each}
	</div>
</Card>
