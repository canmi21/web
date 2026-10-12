<script lang="ts">
	/**
	 * How the light and the dark answer each other, both drawn at once, since the page is about
	 * where they differ: all the grays from either end, the way each leans, the grounds that do not,
	 * the step the dark takes half again as far, and the lightness it is measured in. Every value is
	 * worked out from the style's files, so the page shows the system as it is.
	 */
	import * as stylex from '@stylexjs/stylex';
	import type { Theme } from '@canmi/design/theme';
	import { borderWidth, fontSize, fontWeight, radius } from '@canmi/design/scale.stylex';
	import Icon from '@canmi/design/components/icon.svelte';
	import ThemeScope from '@canmi/design/components/theme-scope.svelte';
	import Tooltip from '@canmi/design/components/tooltip.svelte';
	import CheckIcon from '@tabler/icons-svelte-runes/icons/check';
	import Box from '#lib/specimen/box.svelte';
	import Card from '#lib/specimen/card.svelte';
	import { lightnessOf, stepOf } from '#lib/specimen/lightness.ts';
	import Scales from '#lib/specimen/scales.svelte';
	import StepDial from '#lib/specimen/step-dial.svelte';
	import Swatch from '#lib/specimen/swatch.svelte';
	import { pageTheme } from '#lib/specimen/page-theme.svelte.ts';
	import Relief from '#lib/specimen/relief.svelte';
	import { Ticks } from '#lib/specimen/ticks.svelte.ts';

	const THEMES = [
		{ theme: 'light', label: 'Light' },
		{ theme: 'dark', label: 'Dark' },
	] as const satisfies readonly { theme: Theme; label: string }[];

	const GROUNDS = [
		{ name: 'Base', token: '--background-base' },
		{ name: 'Surface', token: '--background-surface' },
	] as const;
	/** The grays laid on a ground, which lean toward the text. */
	const INKS = [
		{ name: 'Interaction subtle', token: '--interaction-subtle' },
		{ name: 'Interaction muted', token: '--interaction-muted' },
		{ name: 'Interaction default', token: '--interaction-default' },
		{ name: 'Interaction strong', token: '--interaction-strong' },
		{ name: 'Border subtle', token: '--border-subtle' },
		{ name: 'Border default', token: '--border-default' },
		{ name: 'Border strong', token: '--border-strong' },
	] as const;
	const ALL = [...GROUNDS, ...INKS];
	/**
	 * A theme's way from its base to its text: the inks in the order they stand off the base, each
	 * nearer the text than the last.
	 */
	const TEXT = { name: 'Text strong', token: '--foreground-strong' };
	const WAY = [
		GROUNDS[0],
		...INKS.toSorted((a, b) => stepOf(a.token, 'light') - stepOf(b.token, 'light')),
		TEXT,
	];

	/** The marks ticked, by their token and theme. */
	const ticks = new Ticks();

	/**
	 * Every gray of both themes as it shows on its own base, and the neutral they share, lightest to
	 * darkest: one ramp, each theme's set at its own end. The page's own theme stands at its left.
	 */
	const FAMILY = [
		...THEMES.flatMap(({ theme, label }) =>
			ALL.map((gray) => ({
				key: `${gray.token}:${theme}`,
				name: `${label} ${gray.name.toLowerCase()}`,
				token: gray.token,
				theme: theme as Theme | undefined,
				lightness: lightnessOf(gray.token, theme),
			})),
		),
		{
			key: '--background-neutral',
			name: 'Neutral',
			token: '--background-neutral',
			theme: undefined,
			lightness: lightnessOf('--background-neutral', 'light'),
		},
	].toSorted((a, b) => b.lightness - a.lightness);

	/** The page's theme, so the ramp starts from the reader's own end in the first frame. */
	const theme = pageTheme();
	const ramp = $derived(theme.current === 'dark' ? FAMILY.toReversed() : FAMILY);

	/** A cell of the ramp at its widest, in rem. */
	const CELL = 3;

	/** The tile and the gap of the windows side by side, in rem, the materials' first card's. */
	const TILE = 4.5;
	const GAP = 0.75;

	const styles = stylex.create({
		/** The card again, on the page's own ground, what it shows standing in it. */
		box: {
			display: 'flex',
			flexDirection: 'column',
			gap: '1rem',
			padding: '2rem',
			borderWidth: borderWidth.hairline,
			borderStyle: 'solid',
			borderColor: 'var(--border-default)',
			borderRadius: radius.lg,
			backgroundColor: 'var(--background-base)',
		},
		/** The ramp, ringed as one, its cells abutting so no ground shows between them. */
		ramp: {
			display: 'flex',
			borderRadius: radius.lg,
			boxShadow: `0 0 0 ${borderWidth.hairline} var(--border-default)`,
		},
		/** A cell's share of the card, nine grays a theme and the neutral, at most `CELL`. */
		cell: {
			display: 'flex',
			alignItems: 'center',
			justifyContent: 'center',
			width: `min(${CELL}rem, (100cqw - 4rem) / 19)`,
			height: '5rem',
			padding: 0,
			borderWidth: 0,
			backgroundColor: 'var(--background-base)',
			color: 'var(--foreground-strong)',
			cursor: 'copy',
		},
		first: { borderStartStartRadius: radius.lg, borderEndStartRadius: radius.lg },
		last: { borderStartEndRadius: radius.lg, borderEndEndRadius: radius.lg },
		/** A box a scene fills to its edge, cut off there as a window onto it would be. */
		bleed: { padding: 0, overflow: 'hidden' },
		/** A box both themes stand in at once, on the gray they share, so neither is the odd one. */
		neutral: { backgroundColor: 'var(--background-neutral)' },
		/** A window held in one theme, painted in its base. */
		window: {
			display: 'flex',
			justifyContent: 'center',
			flexWrap: 'wrap',
			padding: '1.5rem',
			borderWidth: borderWidth.hairline,
			borderStyle: 'solid',
			borderColor: 'var(--border-default)',
			borderRadius: radius.lg,
			backgroundColor: 'var(--background-base)',
		},
		row: { display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: `${GAP}rem` },
		/** A theme's way from its base to its text, every ink on it in the order it steps. */
		way: { flexDirection: 'column', alignItems: 'stretch', gap: '0.75rem' },
		path: {
			display: 'grid',
			/* The base, the seven inks and the text. */
			gridTemplateColumns: 'repeat(9, 1fr)',
			borderRadius: radius.lg,
			boxShadow: `0 0 0 ${borderWidth.hairline} var(--border-default)`,
		},
		/** A stop on the way: an ink as its theme lays it, over that theme's base. */
		stop: {
			display: 'flex',
			alignItems: 'center',
			justifyContent: 'center',
			width: '100%',
			height: '4rem',
			padding: 0,
			borderWidth: 0,
			backgroundColor: 'var(--background-base)',
			color: 'var(--foreground-strong)',
			cursor: 'copy',
		},
		text: {
			fontSize: '1.5rem',
			fontWeight: fontWeight.medium,
			color: 'var(--foreground-strong)',
		},
		ends: {
			display: 'flex',
			alignItems: 'center',
			gap: '0.75rem',
			fontSize: fontSize.caption,
			color: 'var(--foreground-subtle)',
		},
		/** A hairline from the base to the text, its head at the text. */
		arrow: {
			position: 'relative',
			flexGrow: 1,
			height: borderWidth.hairline,
			backgroundColor: 'var(--border-strong)',
			'::after': {
				content: '""',
				position: 'absolute',
				right: 0,
				top: '50%',
				width: '0.375rem',
				height: '0.375rem',
				borderTopWidth: borderWidth.hairline,
				borderRightWidth: borderWidth.hairline,
				borderTopStyle: 'solid',
				borderRightStyle: 'solid',
				borderColor: 'var(--border-strong)',
				transform: 'translateY(-50%) rotate(45deg)',
			},
		},
	});

	/** A gray as its theme lays it: its value over the base the tile is painted in. */
	const laid = (token: string) => `linear-gradient(var(${token}), var(${token}))`;
</script>

<svelte:head>
	<title>Light and Dark</title>
</svelte:head>

<div class="flex flex-col gap-6">
	<Card title="Both Themes" rule="Both themes use the same grays, one from each end." rfc="trwdn">
		<Box row="{FAMILY.length * CELL}rem" ratio="2">
			<div class={stylex.attrs(styles.ramp).class}>
				{#each ramp as gray, index (gray.key)}
					{@const cell = stylex.attrs(
						styles.cell,
						index === 0 && styles.first,
						index === ramp.length - 1 && styles.last,
					).class}
					{#snippet press()}
						<button
							type="button"
							aria-label="Copy {gray.token}, {gray.name}"
							class={cell}
							style:background-image={laid(gray.token)}
							onclick={() => ticks.copy(gray.token, gray.key)}
						>
							{#if ticks.has(gray.key)}
								<Icon icon={CheckIcon} size={16} stroke={3} />
							{/if}
						</button>
					{/snippet}
					<Tooltip label={gray.name}>
						{#if gray.theme}
							<ThemeScope theme={gray.theme}>{@render press()}</ThemeScope>
						{:else}
							{@render press()}
						{/if}
					</Tooltip>
				{/each}
			</div>
		</Box>
	</Card>

	<Card
		title="Side by Side"
		rule="A gray keeps its name in both themes, drawn on that theme's base."
		rfc="trwdn"
	>
		<div class={stylex.attrs(styles.box, styles.neutral).class}>
			{#each THEMES as { theme } (theme)}
				<ThemeScope {theme}>
					<div class={stylex.attrs(styles.window).class}>
						<div class={stylex.attrs(styles.row).class}>
							{#each ALL as gray (gray.token)}
								<Swatch name={gray.name} token={gray.token} size="{TILE}rem" reach="{GAP / 2}rem" />
							{/each}
						</div>
					</div>
				</ThemeScope>
			{/each}
		</div>
	</Card>

	<Card
		title="Toward the Text"
		rule="Ranks and borders move toward the text, darker in the light theme and lighter in the dark."
		rfc="ic4cd"
	>
		<div class={stylex.attrs(styles.box, styles.neutral).class}>
			{#each THEMES as { theme } (theme)}
				<ThemeScope {theme}>
					<div class={stylex.attrs(styles.window, styles.way).class}>
						<div class={stylex.attrs(styles.path).class}>
							{#each WAY as gray, index (gray.token)}
								{@const key = `${theme}:${gray.token}`}
								<Tooltip label={gray.name}>
									<button
										type="button"
										aria-label="Copy {gray.token}, {gray.name}"
										class={stylex.attrs(
											styles.stop,
											index === 0 && styles.first,
											index === WAY.length - 1 && styles.last,
											gray.token === TEXT.token && styles.text,
										).class}
										style:background-image={gray.token === TEXT.token
											? undefined
											: laid(gray.token)}
										onclick={() => ticks.copy(gray.token, key)}
									>
										{#if ticks.has(key)}
											<Icon icon={CheckIcon} size={18} stroke={3} />
										{:else if gray.token === TEXT.token}
											Aa
										{/if}
									</button>
								</Tooltip>
							{/each}
						</div>
						<div class={stylex.attrs(styles.ends).class}>
							<span>Base</span>
							<span class={stylex.attrs(styles.arrow).class}></span>
							<span>Text</span>
						</div>
					</div>
				</ThemeScope>
			{/each}
		</div>
	</Card>

	<Card
		title="The Grounds"
		rule="In both themes the surface stands above the base, one step lighter."
		rfc="c656n"
	>
		<div class={stylex.attrs(styles.box, styles.neutral, styles.bleed).class}>
			<Relief />
		</div>
	</Card>

	<Card
		title="Step Ratio"
		rule="Each step in the dark theme is 1.5 times the light's, in ΔL*."
		rfc="trwdn"
	>
		<StepDial />
	</Card>

	<Card
		title="Lightness Scale"
		rule="Steps are measured in CIELAB lightness, which keeps grays evenly spaced from black to white."
		rfc="trwdn"
	>
		<Scales />
	</Card>
</div>
