<script lang="ts">
	/**
	 * Why a step is measured in CIELAB L*: one stretch near black, from black to a dark gray, cut
	 * into even steps by each of three scales in turn. Even in sRGB levels the steps grow as they
	 * climb; even in oklch L the first ones are all black, which is how a surface stepped by it sank
	 * into its base; even in L* each reads as far as the last -- RFC trwdn.
	 */
	import * as stylex from '@stylexjs/stylex';
	import { borderWidth, fontSize, fontWeight, radius } from '@canmi/design/scale.stylex';
	import ThemeScope from '@canmi/design/components/theme-scope.svelte';
	import Tooltip from '@canmi/design/components/tooltip.svelte';
	import Box from './box.svelte';
	import { pageTheme } from './page-theme.svelte.ts';

	/** The stretch's top, in L*, and how many even steps each scale cuts it into. */
	const TOP = 20;
	const STEPS = 8;
	/** A cell's width and height at most, in rem, and the strip they make, a scale's name over it. */
	const CELL = 4;
	const TALL = 2.5;
	const ROW = (STEPS + 1) * CELL;

	/** CIELAB's lightness of a luminance and back, and sRGB's encoding and back. */
	const lStar = (y: number) => (y > 216 / 24389 ? 116 * Math.cbrt(y) - 16 : (y * 24389) / 27);
	const fromLStar = (l: number) => (l > 8 ? ((l + 16) / 116) ** 3 : (l * 27) / 24389);
	const encode = (y: number) => (y <= 0.0031308 ? 12.92 * y : 1.055 * y ** (1 / 2.4) - 0.055);
	const decode = (s: number) => (s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4);

	/** Each scale: its name, and the luminance of a point a share of the way up the stretch. */
	const top = fromLStar(TOP);
	const SCALES = [
		{
			name: 'sRGB',
			at: (t: number) => decode(t * encode(top)),
			read: (y: number) => `sRGB ${Math.round(encode(y) * 255)}`,
		},
		{
			name: 'oklch L',
			at: (t: number) => (t * Math.cbrt(top)) ** 3,
			read: (y: number) => `oklch L ${Math.cbrt(y).toFixed(3)}`,
		},
		{
			name: 'CIELAB L*',
			at: (t: number) => fromLStar(t * TOP),
			read: (y: number) => `L* ${lStar(y).toFixed(1)}`,
		},
	];

	/** Each scale's cells: the gray drawn, and how that scale writes it, which its tip shows. */
	const ROWS = SCALES.map(({ name, at, read }) => ({
		name,
		cells: Array.from({ length: STEPS + 1 }, (_, index) => {
			const y = at(index / STEPS);
			return { css: `oklch(${Math.cbrt(y).toFixed(4)} 0 0)`, reading: read(y) };
		}),
	}));

	/** Each strip from the page's own end: black first in the dark, the gray first in the light. */
	const theme = pageTheme();
	const shown = $derived(
		theme.current === 'light'
			? ROWS.map((row) => ({ ...row, cells: row.cells.toReversed() }))
			: ROWS,
	);

	const styles = stylex.create({
		rows: { display: 'flex', flexDirection: 'column', gap: '1.5rem' },
		/** A scale: its name, then its strip, the name starting where the strip starts. */
		scale: { display: 'flex', flexDirection: 'column', gap: '0.5rem' },
		/** A scale's name, white on the neutral whatever the page's theme: it is held in the dark. */
		name: {
			fontSize: fontSize.caption,
			fontWeight: fontWeight.medium,
			color: 'var(--foreground-strong)',
			whiteSpace: 'nowrap',
		},
		/** A stretch cut into its steps, side by side, ringed as one. */
		strip: {
			display: 'grid',
			gridTemplateColumns: `repeat(${STEPS + 1}, min(${CELL}rem, (100cqw - 4rem) / ${STEPS + 1}))`,
			borderRadius: radius.lg,
			boxShadow: `0 0 0 ${borderWidth.hairline} var(--border-default)`,
		},
		cell: { display: 'block', width: '100%', height: `${TALL}rem` },
		first: { borderStartStartRadius: radius.lg, borderEndStartRadius: radius.lg },
		last: { borderStartEndRadius: radius.lg, borderEndEndRadius: radius.lg },
		tip: {
			fontFamily: 'var(--font-mono)',
			wordSpacing: '-0.5ch',
			fontVariantNumeric: 'tabular-nums',
		},
	});
</script>

<Box row="{ROW}rem" ratio="1/2" ground="neutral">
	<div class={stylex.attrs(styles.rows).class}>
		{#each shown as row (row.name)}
			<div class={stylex.attrs(styles.scale).class}>
				<ThemeScope theme="dark"
					><span class={stylex.attrs(styles.name).class}>{row.name}</span></ThemeScope
				>
				<div class={stylex.attrs(styles.strip).class}>
					{#each row.cells as cell, index (index)}
						<Tooltip>
							{#snippet content()}
								<span class={stylex.attrs(styles.tip).class}>{cell.reading}</span>
							{/snippet}
							<span
								class={stylex.attrs(
									styles.cell,
									index === 0 && styles.first,
									index === STEPS && styles.last,
								).class}
								style:background-color={cell.css}
							></span>
						</Tooltip>
					{/each}
				</div>
			</div>
		{/each}
	</div>
</Box>
