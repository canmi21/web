import * as stylex from '@stylexjs/stylex';
import { border, family, figures, radius, text, weight } from '@canmi/kit/tokens/vocabulary.stylex';
import { fontSize, radius as step } from '@canmi/design/scale.stylex';

/**
 * The console's recipes, on the palette's semantic names and the kit's vocabulary: color, type,
 * border and radius here, where a thing sits in the markup. See spec/architecture/css/layers.md.
 */
export const surfaces = stylex.create({
	/** A bar ruled off from what is under it, on the ground. */
	bar: {
		backgroundColor: 'var(--background-base)',
		borderBottomWidth: border.hairlinePx,
		borderBottomStyle: 'solid',
		borderBottomColor: 'var(--border-subtle)',
	},
	card: {
		backgroundColor: 'var(--background-surface)',
		borderWidth: border.hairlinePx,
		borderStyle: 'solid',
		borderColor: 'var(--border-default)',
		borderRadius: radius.xl,
		boxShadow: 'var(--shadow-surface)',
	},
	/** A slot with nothing in it yet, said plainly rather than filled. */
	empty: {
		borderRadius: radius.xl,
	},
	rowRule: {
		borderTopWidth: border.hairlinePx,
		borderTopStyle: 'solid',
		borderTopColor: 'var(--border-default)',
	},
	/** The same rule between the items of a list, and none above the first. */
	listRule: {
		borderTopWidth: border.hairlinePx,
		borderTopStyle: 'solid',
		borderTopColor: { default: 'var(--border-default)', ':first-child': 'transparent' },
	},
	well: {
		backgroundColor: 'var(--background-base)',
		borderRadius: radius.lg,
	},
	pill: {
		borderRadius: radius.full,
	},
	dot: {
		borderRadius: radius.full,
		backgroundColor: 'currentColor',
	},
});

/**
 * A corner a mark holds of its own, one of the scale's steps, written in StyleX and never as a
 * `rounded-*` class -- lib's spec/design/styles.md, "The scale".
 */
export const corners = stylex.create({
	xs: { borderRadius: step.xs },
	md: { borderRadius: step.md },
	full: { borderRadius: step.full },
});

export const type = stylex.create({
	title: {
		fontSize: fontSize.headline,
		fontWeight: weight.semibold,
		letterSpacing: '-0.02em', // unnamed: a display size drawn tight
		color: 'var(--foreground-strong)',
	},
	heading: {
		fontSize: text.px14,
		fontWeight: weight.semibold,
		color: 'var(--foreground-strong)',
	},
	name: {
		fontSize: text.px14,
		fontWeight: weight.medium,
		color: 'var(--foreground-strong)',
	},
	body: {
		fontSize: text.px14,
		color: 'var(--foreground-default)',
	},
	soft: {
		fontSize: text.px13,
		color: 'var(--foreground-muted)',
	},
	label: {
		fontSize: text.px13,
		color: 'var(--foreground-muted)',
	},
	figure: {
		fontSize: text.px13,
		fontVariantNumeric: figures.tabular,
		color: 'var(--foreground-strong)',
	},
	mono: {
		fontFamily: family.monoTheme,
		fontSize: text.px12,
	},
	/** A figure read out in the shell's face, at the size around it: a percent, a count, a span. */
	shell: {
		fontFamily: 'var(--font-shell)',
		fontVariantNumeric: figures.tabular,
	},
});

/** The one color a state is shown in, wherever it is shown. */
export const tone = stylex.create({
	good: { color: 'var(--status-success)' },
	busy: { color: 'var(--status-info)' },
	warn: { color: 'var(--status-warning)' },
	bad: { color: 'var(--status-critical)' },
	quiet: { color: 'var(--foreground-muted)' },
});

export type Tone = keyof typeof tone;

/** A state's word washed in its tone. */
export const wash = stylex.create({
	good: { backgroundColor: 'color-mix(in srgb, var(--status-success) 14%, transparent)' },
	busy: { backgroundColor: 'color-mix(in srgb, var(--status-info) 14%, transparent)' },
	warn: { backgroundColor: 'color-mix(in srgb, var(--status-warning) 14%, transparent)' },
	bad: { backgroundColor: 'color-mix(in srgb, var(--status-critical) 16%, transparent)' },
	quiet: { backgroundColor: 'var(--interaction-strong)' },
});
