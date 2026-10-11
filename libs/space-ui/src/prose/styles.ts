/**
 * How prose is drawn, every value a token or a measure written beside why it has no name. Shared
 * by the nodes so a heading and its paragraph keep one rhythm. See lib's spec/design/styles.md.
 */
import * as stylex from '@stylexjs/stylex';
import { borderWidth, fontSize, fontWeight, lineHeight, radius } from '@canmi/design/scale.stylex';

export const styles = stylex.create({
	root: {
		display: 'flex',
		flexDirection: 'column',
		gap: '0.75rem',
		fontSize: '1rem', // unnamed: the reader's own size, for prose to read
		lineHeight: lineHeight.relaxed,
		color: 'var(--foreground-default)',
	},
	h2: {
		marginTop: '1.25rem',
		fontSize: '1.125rem', // unnamed: a section's title, a step over the prose
		fontWeight: fontWeight.semibold,
		color: 'var(--foreground-strong)',
	},
	h3: {
		marginTop: '0.75rem',
		fontSize: '1rem',
		fontWeight: fontWeight.semibold,
		color: 'var(--foreground-strong)',
	},
	strong: { fontWeight: fontWeight.semibold, color: 'var(--foreground-strong)' },
	link: {
		color: 'var(--foreground-strong)',
		textDecorationLine: 'underline',
		textDecorationColor: 'var(--border-strong)',
		textUnderlineOffset: '0.2em',
	},
	list: { display: 'flex', flexDirection: 'column', gap: '0.375rem', paddingLeft: '1.25rem' },
	bullets: { listStyleType: 'disc' },
	numbers: { listStyleType: 'decimal' },
	item: { paddingLeft: '0.25rem', '::marker': { color: 'var(--foreground-subtle)' } },
	code: {
		paddingInline: '0.3em',
		borderRadius: radius.sm,
		backgroundColor: 'var(--interaction-muted)',
		fontFamily: 'var(--font-mono)',
		fontSize: '0.875em',
	},
	block: {
		overflowX: 'auto',
		padding: '0.75rem 1rem',
		borderWidth: borderWidth.hairline,
		borderStyle: 'solid',
		borderColor: 'var(--border-default)',
		borderRadius: radius.lg,
		backgroundColor: 'var(--background-base)',
		fontFamily: 'var(--font-mono)',
		fontSize: fontSize.label,
		lineHeight: 1.6,
	},
	quote: {
		paddingLeft: '1rem',
		borderLeftWidth: '2px', // unnamed: a quote's rule, wider than a hairline to be seen as one
		borderLeftStyle: 'solid',
		borderLeftColor: 'var(--border-default)',
		color: 'var(--foreground-muted)',
	},
	rule: {
		borderWidth: 0,
		borderTopWidth: borderWidth.hairline,
		borderTopStyle: 'solid',
		borderTopColor: 'var(--border-default)',
	},
	tableBox: { overflowX: 'auto' },
	table: { width: '100%', borderCollapse: 'collapse', fontSize: fontSize.body },
	cell: {
		paddingBlock: '0.5rem',
		paddingInline: '0.75rem',
		textAlign: 'left',
		verticalAlign: 'top',
		borderBottomWidth: borderWidth.hairline,
		borderBottomStyle: 'solid',
		borderBottomColor: 'var(--border-default)',
	},
	head: { fontWeight: fontWeight.medium, color: 'var(--foreground-strong)' },
	unknown: {
		color: 'var(--status-critical)',
		fontFamily: 'var(--font-mono)',
		fontSize: fontSize.label,
	},
});
