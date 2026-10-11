<script lang="ts">
	/**
	 * The system's hues on a card, under a title and a sentence: each hue a pair of capsules, the
	 * dark's then the light's, the wells in the page's theme and each hue held in its own. A capsule
	 * is named by its tip and copies its token as code reads it; the card cites the RFC behind it.
	 */
	import * as stylex from '@stylexjs/stylex';
	import { borderWidth, fontWeight, lineHeight, radius } from '@canmi/design/scale.stylex';
	import Icon from '@canmi/design/components/icon.svelte';
	import ThemeScope from '@canmi/design/components/theme-scope.svelte';
	import Tooltip from '@canmi/design/components/tooltip.svelte';
	import RfcRef from '@canmi/space-ui/rfc-ref.svelte';
	import { dev } from '$app/env';
	import CheckIcon from '@tabler/icons-svelte-runes/icons/check';
	import { SvelteMap } from 'svelte/reactivity';

	/** The interaction's own hue alone, then the statuses together. */
	const GROUPS = [
		[{ name: 'Focus', token: '--interaction-focus' }],
		[
			{ name: 'Info', token: '--status-info' },
			{ name: 'Success', token: '--status-success' },
			{ name: 'Warning', token: '--status-warning' },
			{ name: 'Critical', token: '--status-critical' },
		],
	] as const;

	const THEMES = ['dark', 'light'] as const;

	/** A capsule's size, its inset, and the gaps within a hue's pair and between pairs, in rem. */
	const WELL = 2.5;
	const TALL = 10;
	const INSET = 0.5;
	const WITHIN = 0.75;
	const BETWEEN = 1.5;
	const HUES = GROUPS.flat().length;
	/** The whole row's width at its largest, the size every measure below is a share of. */
	const ROW = HUES * 2 * WELL + HUES * WITHIN + (HUES - 1) * BETWEEN;
	/** The least the box keeps either side of the row when the row has to shrink. */
	const SIDE = 2;
	/**
	 * The row as wide as it is drawn: its full width, or the box less its sides where that is
	 * narrower. Every measure of the row is its share of this, so the capsules shrink whole.
	 */
	const DRAWN = `min(${ROW}rem, calc(100cqw - ${2 * SIDE}rem))`;
	const share = (rem: number) => `calc(${DRAWN} * ${rem / ROW})`;

	/** The capsules ticked, each with its own clock: a copy ticks one without clearing another. */
	const ticked = new SvelteMap<string, ReturnType<typeof setTimeout>>();

	/** Copy a capsule's token as code reads it, and tick it for a while from this copy. */
	async function copy(token: string, key: string) {
		await navigator.clipboard.writeText(`var(${token})`);
		clearTimeout(ticked.get(key));
		ticked.set(
			key,
			setTimeout(() => ticked.delete(key), 1200),
		);
	}

	const appear = stylex.keyframes({
		from: { opacity: 0, transform: 'scale(0.6)' },
		to: { opacity: 1, transform: 'scale(1)' },
	});

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
		/** A container, so the box below can read its own width. */
		body: {
			containerType: 'inline-size',
			display: 'flex',
			flexGrow: 1,
			flexDirection: 'column',
			paddingInline: '1.25rem',
			paddingTop: '0.75rem',
			paddingBottom: '1.25rem',
		},
		/**
		 * The card again, on the page's own ground, the hues standing in it half as far from its top
		 * and bottom as the row leaves either side, whatever its width, and never nearer than a side.
		 */
		box: {
			display: 'flex',
			justifyContent: 'center',
			gap: share(BETWEEN),
			paddingBlock: `max(${SIDE}rem, calc((100cqw - ${DRAWN}) / 4))`,
			borderWidth: borderWidth.hairline,
			borderStyle: 'solid',
			borderColor: 'var(--border-default)',
			borderRadius: radius.xl,
			backgroundColor: 'var(--background-base)',
		},
		/** A hue's two capsules, closer to each other than to the next hue's. */
		pair: { display: 'flex', gap: share(WITHIN) },
		/** A capsule's well, a button that copies its token, and says so by the cursor. */
		well: {
			position: 'relative',
			display: 'flex',
			flexShrink: 0,
			width: share(WELL),
			height: share(TALL),
			padding: share(INSET),
			borderWidth: 0,
			borderRadius: radius.full,
			backgroundColor: 'var(--background-surface)',
			boxShadow: `0 0 0 ${borderWidth.hairline} var(--border-default)`,
			cursor: 'copy',
		},
		/**
		 * The well's unseen reach into half of each gap beside it, so the pointer crossing from one
		 * capsule to the next never leaves both and the tips follow it without a break.
		 */
		reach: {
			'::before': {
				content: '""',
				position: 'absolute',
				top: 0,
				bottom: 0,
				left: `calc(-1 * ${share(BETWEEN / 2)})`,
				right: `calc(-1 * ${share(WITHIN / 2)})`,
			},
		},
		reachAfter: {
			'::before': {
				left: `calc(-1 * ${share(WITHIN / 2)})`,
				right: `calc(-1 * ${share(BETWEEN / 2)})`,
			},
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
		/**
		 * The tick a copy leaves, over the middle of the hue: white in either theme, held in the dark,
		 * since the hues do not change with the page and white reads on both sets of them.
		 */
		tick: {
			position: 'absolute',
			inset: 0,
			display: 'flex',
			alignItems: 'center',
			justifyContent: 'center',
			color: 'var(--foreground-strong)',
			pointerEvents: 'none',
			animationName: appear,
			animationDuration: '150ms',
			animationTimingFunction: 'ease-out',
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
			Each at its purest, the dark's then the light's, a step lighter. <RfcRef id="b0i0r" {dev} />
		</p>
	</header>
	<div class={stylex.attrs(styles.body).class}>
		<div class={stylex.attrs(styles.box).class}>
			{#each GROUPS.flat() as hue (hue.token)}
				<div class={stylex.attrs(styles.pair).class}>
					{#each THEMES as theme, index (theme)}
						{@const key = `${hue.token}:${theme}`}
						<Tooltip label={hue.name}>
							<button
								type="button"
								aria-label="Copy {hue.token}, {hue.name} in the {theme}"
								class={stylex.attrs(styles.well, styles.reach, index > 0 && styles.reachAfter)
									.class}
								onclick={() => copy(hue.token, key)}
							>
								<ThemeScope {theme}>
									<span
										class={stylex.attrs(styles.hue).class}
										style:background-color="var({hue.token})"
									></span>
								</ThemeScope>
								{#if ticked.has(key)}
									<ThemeScope theme="dark">
										<span class={stylex.attrs(styles.tick).class}>
											<Icon icon={CheckIcon} size={16} stroke={3} />
										</span>
									</ThemeScope>
								{/if}
							</button>
						</Tooltip>
					{/each}
				</div>
			{/each}
		</div>
	</div>
</section>
