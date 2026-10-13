<script lang="ts">
	/**
	 * The same small screen in both themes, the light's as it is and the dark's grays worked out
	 * again from a ratio the reader sets: each gray stepped off the dark's base that many times as
	 * far, in CIELAB L*, as the light's is off its own. Under each screen a bar as long as its ratio
	 * shows the two are not one to one. At 1 the dark's grays sink into its base, and the style's 1.5
	 * is where the two read alike -- RFC trwdn.
	 */
	import * as stylex from '@stylexjs/stylex';
	import { ring } from '@canmi/space-ui/ring';
	import { borderWidth, radius } from '@canmi/design/scale.stylex';
	import Point from '@canmi/design/components/point.svelte';
	import ThemeScope from '@canmi/design/components/theme-scope.svelte';
	import { levelOf, lightnessOf, stepOf } from './lightness.ts';

	/** The grays the screen is drawn in, each a step off the base. */
	const GRAYS = [
		'--background-surface',
		'--interaction-subtle',
		'--interaction-muted',
		'--interaction-default',
		'--interaction-strong',
		'--border-subtle',
		'--border-default',
		'--border-strong',
	];
	/** The style's own ratio, where the dial starts, and the dial's reach. */
	const STYLE = 1.5;
	const [LEAST, MOST] = [1, 2];

	/**
	 * A window's width at most, and the least room either side of the pair, in rem. The room either
	 * side is what the pair leaves of the box, and above and below is the same.
	 */
	const WINDOW = 24;
	const SIDE = 3;
	const GAP = 1;
	const side = `max(${SIDE}rem, (100cqw - ${2 * WINDOW + GAP}rem) / 2)`;

	/**
	 * The dial's notch, how near the style's ratio a drag is drawn onto it, unseen and a little wider
	 * than a notch, and the knob's width, in rem.
	 */
	const NOTCH = 0.1;
	const PULL = 0.08;
	const KNOB = 0.875;
	/** How far the reading's point stands out, and the gap from its tip to the knob, as a tip's. */
	const POINT = 5;
	const CLEAR = 4;

	let ratio = $state(STYLE);
	/** The pointer over the knob, or the knob held: either shows its reading over it. */
	let onKnob = $state(false);
	let holding = $state(false);
	const share = $derived((ratio - LEAST) / (MOST - LEAST));

	/**
	 * A drag lands on the nearest notch, but near the style's ratio it is drawn onto it, the knob
	 * with it: the range is told again, since a ratio already where it was changes nothing.
	 */
	function settle(event: Event & { currentTarget: HTMLInputElement }) {
		const value = Number(event.currentTarget.value);
		ratio =
			Math.abs(value - STYLE) < PULL
				? STYLE
				: Number((Math.round(value / NOTCH) * NOTCH).toFixed(1));
		event.currentTarget.value = String(ratio);
	}
	let card: HTMLElement | undefined = $state();

	/** Whether the pointer stands over the knob, worked out from where the knob is drawn. */
	function over(event: PointerEvent) {
		const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
		const knob = KNOB * parseFloat(getComputedStyle(document.documentElement).fontSize);
		const middle = rect.left + knob / 2 + (rect.width - knob) * share;
		onKnob = Math.abs(event.clientX - middle) <= knob;
	}

	/**
	 * Each gray of the dark at `ratio`: the surface as an opaque gray, the rest as the text's white
	 * laid over the base at whatever share brings it that far off, as a browser blends it.
	 */
	const overrides = $derived.by(() => {
		const base = lightnessOf('--background-base', 'dark');
		const under = levelOf(base);
		return GRAYS.map((token) => {
			const target = base + stepOf(token, 'light') * ratio;
			if (token === '--background-surface') {
				const l = Math.cbrt(target > 8 ? ((target + 16) / 116) ** 3 : (target * 27) / 24389);
				return `${token}: oklch(${l.toFixed(4)} 0 0)`;
			}
			const laid = (levelOf(target) - under) / (1 - under);
			return `${token}: oklch(1 0 0 / ${(laid * 100).toFixed(2)}%)`;
		}).join('; ');
	});

	const styles = stylex.create({
		/**
		 * The box both themes stand in, on the one gray they share, the same room above and below as
		 * either side, the dial floating in the middle of the room at its foot.
		 */
		box: {
			position: 'relative',
			alignSelf: 'stretch',
			display: 'grid',
			gridTemplateColumns: { default: '1fr', '@container (min-width: 36rem)': '1fr 1fr' },
			gap: `${GAP}rem`,
			paddingInline: 'var(--side)',
			paddingBlock: 'var(--side)',
			borderWidth: borderWidth.hairline,
			borderStyle: 'solid',
			borderColor: 'var(--border-default)',
			borderRadius: radius.lg,
			backgroundColor: 'var(--background-neutral)',
		},
		/** A window held in one theme, painted in its base. */
		window: {
			display: 'flex',
			flexDirection: 'column',
			gap: '1rem',
			padding: '1.25rem',
			borderWidth: borderWidth.hairline,
			borderStyle: 'solid',
			borderColor: 'var(--border-default)',
			borderRadius: radius.lg,
			backgroundColor: 'var(--background-base)',
		},
		/** A card as a screen has one: a region on the surface, the rest of the grays inside it. */
		card: {
			display: 'flex',
			flexDirection: 'column',
			gap: '0.75rem',
			padding: '1rem',
			borderWidth: borderWidth.hairline,
			borderStyle: 'solid',
			borderColor: 'var(--border-default)',
			borderRadius: radius.lg,
			backgroundColor: 'var(--background-surface)',
		},
		head: { display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
		/** A line of words, drawn as a bar of the text's color. */
		words: {
			display: 'block',
			flexShrink: 0,
			height: '0.375rem',
			borderRadius: radius.full,
			backgroundColor: 'var(--foreground-subtle)',
		},
		title: { height: '0.5rem', backgroundColor: 'var(--foreground-muted)' },
		list: { display: 'flex', flexDirection: 'column', gap: '0.25rem' },
		row: {
			display: 'flex',
			alignItems: 'center',
			height: '2rem',
			paddingInline: '0.625rem',
			borderRadius: radius.md,
		},
		hovered: { backgroundColor: 'var(--interaction-subtle)' },
		chosen: { backgroundColor: 'var(--interaction-muted)' },
		button: {
			display: 'flex',
			alignItems: 'center',
			justifyContent: 'center',
			width: '3.5rem',
			height: '1.5rem',
			borderRadius: radius.md,
		},
		outlined: {
			borderWidth: borderWidth.hairline,
			borderStyle: 'solid',
			borderColor: 'var(--border-strong)',
		},
		/** How far this theme steps against the light's: a bar as long as the ratio, and the ratio. */
		measure: {
			display: 'flex',
			alignItems: 'center',
			gap: '0.75rem',
			fontFamily: 'var(--font-mono)',
			fontSize: '0.8125rem',
			color: 'var(--foreground-muted)',
			fontVariantNumeric: 'tabular-nums',
		},
		track: { flexGrow: 1, display: 'flex' },
		bar: {
			height: '0.375rem',
			borderRadius: radius.full,
			backgroundColor: 'var(--foreground-strong)',
		},
		times: { color: 'var(--foreground-strong)', fontWeight: 600 },
		/** The dial, in the page's own theme, floating in the box's foot. */
		dial: {
			position: 'absolute',
			bottom: 'calc(var(--side) / 2 - 0.875rem)',
			left: '50%',
			transform: 'translateX(-50%)',
			display: 'flex',
			alignItems: 'center',
			gap: '0.75rem',
			paddingInline: '0.875rem',
			height: '1.75rem',
			borderWidth: borderWidth.hairline,
			borderStyle: 'solid',
			borderColor: 'var(--border-default)',
			borderRadius: radius.md,
			backgroundColor: 'var(--background-surface)',
		},
		/**
		 * The range drawn in the page's grays: the track a rank, the part behind the knob the muted
		 * text, the knob the surface ringed in the strong border.
		 */
		range: {
			appearance: 'none',
			width: '10rem',
			height: '1.25rem',
			margin: 0,
			backgroundColor: 'transparent',
			cursor: 'pointer',
			'::-webkit-slider-runnable-track': {
				height: '0.25rem',
				borderRadius: radius.full,
				backgroundImage:
					'linear-gradient(to right, var(--foreground-muted) var(--fill), var(--interaction-strong) var(--fill))',
			},
			'::-moz-range-track': {
				height: '0.25rem',
				borderRadius: radius.full,
				backgroundImage:
					'linear-gradient(to right, var(--foreground-muted) var(--fill), var(--interaction-strong) var(--fill))',
			},
			'::-webkit-slider-thumb': {
				appearance: 'none',
				width: '0.875rem',
				height: '0.875rem',
				marginTop: '-0.3125rem',
				borderWidth: borderWidth.hairline,
				borderStyle: 'solid',
				borderColor: 'var(--border-strong)',
				borderRadius: radius.full,
				backgroundColor: 'var(--background-surface)',
				// The keyboard's ring, on the knob it moves rather than on the range's box -- web's
				// spec/styling/focus.md, "Where the control is not a rectangle".
				outlineWidth: 'var(--ring, 0)',
				outlineStyle: 'solid',
				outlineColor: 'var(--interaction-focus)',
				outlineOffset: 0,
			},
			'::-moz-range-thumb': {
				width: '0.875rem',
				height: '0.875rem',
				borderWidth: borderWidth.hairline,
				borderStyle: 'solid',
				borderColor: 'var(--border-strong)',
				borderRadius: radius.full,
				backgroundColor: 'var(--background-surface)',
				// The keyboard's ring, on the knob it moves rather than on the range's box -- web's
				// spec/styling/focus.md, "Where the control is not a rectangle".
				outlineWidth: 'var(--ring, 0)',
				outlineStyle: 'solid',
				outlineColor: 'var(--interaction-focus)',
				outlineOffset: 0,
			},
		},
		/** The track, and the knob's reading over it. */
		slot: { position: 'relative', display: 'flex', alignItems: 'center' },
		/** The value, over the knob while the pointer is on it or holds it, drawn as a tip is. */
		reading: {
			position: 'absolute',
			bottom: `calc(100% + ${POINT + CLEAR}px)`,
			transform: 'translateX(-50%)',
			paddingInline: '0.5rem',
			paddingBlock: '0.25rem',
			borderWidth: borderWidth.hairline,
			borderStyle: 'solid',
			borderColor: 'var(--border-default)',
			borderRadius: radius.md,
			backgroundColor: 'var(--background-surface)',
			fontFamily: 'var(--font-mono)',
			fontSize: '0.75rem',
			color: 'var(--foreground-strong)',
			fontVariantNumeric: 'tabular-nums',
			whiteSpace: 'nowrap',
			pointerEvents: 'none',
		},
		end: {
			fontFamily: 'var(--font-mono)',
			fontSize: '0.75rem',
			color: 'var(--foreground-subtle)',
		},
	});
</script>

{#snippet screen(times: number)}
	<div class={stylex.attrs(styles.card).class}>
		<div class={stylex.attrs(styles.head).class}>
			<span class={stylex.attrs(styles.words, styles.title).class} style:width="36%"></span>
			<span class={stylex.attrs(styles.button, styles.outlined).class}>
				<span class={stylex.attrs(styles.words).class} style:width="50%"></span>
			</span>
		</div>
		<div class={stylex.attrs(styles.list).class}>
			{#each [undefined, styles.hovered, styles.chosen] as state, index (index)}
				<div class={stylex.attrs(styles.row, state).class}>
					<span class={stylex.attrs(styles.words).class} style:width="{52 - index * 10}%"></span>
				</div>
			{/each}
		</div>
	</div>
	<div class={stylex.attrs(styles.measure).class}>
		<span>ΔL*</span>
		<span class={stylex.attrs(styles.track).class}>
			<span class={stylex.attrs(styles.bar).class} style:width="{(times / MOST) * 100}%"></span>
		</span>
		<span class={stylex.attrs(styles.times).class}>×{times.toFixed(1)}</span>
	</div>
{/snippet}

<div class={stylex.attrs(styles.box).class} style:--side={side}>
	<ThemeScope theme="light">
		<div class={stylex.attrs(styles.window).class}>{@render screen(1)}</div>
	</ThemeScope>
	<ThemeScope theme="dark">
		<div class={stylex.attrs(styles.window).class} style={overrides}>{@render screen(ratio)}</div>
	</ThemeScope>
	<label class={stylex.attrs(styles.dial).class}>
		<span class={stylex.attrs(styles.end).class}>×{LEAST}</span>
		<span class={stylex.attrs(styles.slot).class}>
			<input
				type="range"
				class={stylex.attrs(styles.range, ring.host).class}
				style:--fill="{share * 100}%"
				min={LEAST}
				max={MOST}
				step="0.01"
				value={ratio}
				aria-label="How far the dark steps in ΔL*, against the light"
				oninput={settle}
				onpointermove={over}
				onpointerleave={() => (onKnob = false)}
				onpointerdown={() => (holding = true)}
				onpointerup={() => (holding = false)}
				onpointercancel={() => (holding = false)}
			/>
			{#if onKnob || holding}
				<span
					bind:this={card}
					class={stylex.attrs(styles.reading).class}
					style:left="calc({KNOB / 2}rem + (100% - {KNOB}rem) * {share})"
				>
					×{ratio.toFixed(1)}
					<Point {card} edge="bottom" along="middle" size={POINT} />
				</span>
			{/if}
		</span>
		<span class={stylex.attrs(styles.end).class}>×{MOST}</span>
	</label>
</div>
