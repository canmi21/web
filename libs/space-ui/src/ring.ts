/**
 * The keyboard's ring as space draws it: flush on a control's own shape, and on bare
 * words a fixed room off their ink with a corner that grows with them -- RFC mpy16, web's
 * spec/styling/focus.md. A pointer draws none; `shownControl` and `shownWords` draw it at rest.
 */
import * as stylex from '@stylexjs/stylex';

/** How far a ring stands off the words it is on, at every size. */
export const ROOM = '0.25rem';
/**
 * How far this sans's letters fall below the baseline, `g` measured at every weight: the font's own
 * descent, which `text-box` trims to, is 0.34em, room no letter fills. Named here, as lib names the
 * sans's capitals in `--font-sans-cap-height`, until the style holds it beside them.
 */
const DESCENDER = '0.212em';
/** The ring's width, a focus ring's. */
const WIDTH = '0.125rem';

export const ring = stylex.create({
	/** A control's own ring, flush on its shape. */
	control: {
		outlineWidth: { default: 0, ':focus-visible': WIDTH },
		outlineStyle: 'solid',
		outlineColor: 'var(--interaction-focus)',
		outlineOffset: 0,
	},
	/**
	 * Pressed words, which keep their line and hand the keyboard's ring to their ink, as the kit's
	 * host hands one to an inner child.
	 */
	host: {
		outlineWidth: 0,
		'--ring': { default: '0', ':focus-visible': WIDTH },
	},
	/**
	 * Bare words' ink, trimmed to their capitals and their baseline, ringed one room off it on
	 * every side by a mark that takes no room, so nothing moves. The corner grows with the words,
	 * so it turns as gently at any size.
	 */
	ink: {
		position: 'relative',
		display: 'inline-block',
		textBox: 'trim-both cap alphabetic',
		'::before': {
			content: '""',
			position: 'absolute',
			// Chrome trims to a capital it reads too tall from this sans, so the ring's top comes
			// down by the difference -- lib's spec/design/styles.md, `--font-sans-cap-height`.
			top: `calc((1cap - var(--font-sans-cap-height)) - ${ROOM})`,
			bottom: `calc(-1 * ${ROOM})`,
			left: `calc(-1 * ${ROOM})`,
			right: `calc(-1 * ${ROOM})`,
			borderRadius: 'calc(1em * 2 / 7)',
			outlineWidth: 'var(--ring, 0)',
			outlineStyle: 'solid',
			outlineColor: 'var(--interaction-focus)',
			pointerEvents: 'none',
		},
	},
	/**
	 * Ink with a letter below its baseline: its box still ends on the baseline, so it lays out as
	 * any words do, and only the ring reaches down past the letters that fall, and up by as much,
	 * so it stays centered on the capitals as the eye reads the words.
	 */
	descends: {
		'::before': {
			top: `calc((1cap - var(--font-sans-cap-height)) - ${ROOM} - ${DESCENDER})`,
			bottom: `calc(-1 * ${ROOM} - ${DESCENDER})`,
		},
	},
	/**
	 * Words a tip names, which it points at on their ink as it points at a control on its shape:
	 * `line` around the tip, set in the words' size, keeps the line they set; `fit` on their host
	 * draws no line of its own; `fitted` on their ink starts the host at their capitals.
	 */
	line: { display: 'block' },
	fit: { display: 'inline-flex' },
	fitted: { marginTop: 'calc(var(--font-sans-cap-height) - 1cap)' },
	/** The ring at rest, for a page that shows it: on a control, and on words through their host. */
	shownControl: { outlineWidth: WIDTH },
	shownWords: { '--ring': WIDTH },
});

/** Whether words have a letter that falls below their baseline. */
export const descends = (words: string) => /[gjpqy]/.test(words);

/**
 * Where a pointer counts as on a mark with a tip, unseen: marks in a row share the gaps between
 * them, so the pointer crossing the row never falls between two and the tips follow it without a
 * break -- lib's spec/design/components.md, "Marks with tips in a row share the gaps between
 * them". A row sets `--reach`, half its gap, and `--reach-up` and `--reach-down` on a mark shorter
 * than the row, as far as the row stands past it.
 */
const SIDE = 'var(--reach, 0px)';
const UP = 'var(--reach-up, 0px)';
const DOWN = 'var(--reach-down, 0px)';

export const reach = stylex.create({
	/** A control's: its shape, and the row's share around it. */
	mark: {
		position: 'relative',
		'::after': {
			content: '""',
			position: 'absolute',
			top: `calc(-1 * ${UP})`,
			bottom: `calc(-1 * ${DOWN})`,
			left: `calc(-1 * ${SIDE})`,
			right: `calc(-1 * ${SIDE})`,
		},
	},
	/** Words': their ring's box round their ink, and the row's share around that. */
	words: {
		position: 'relative',
		'::after': {
			content: '""',
			position: 'absolute',
			top: `calc(-1 * (${UP} + ${ROOM}))`,
			bottom: `calc(-1 * (${DOWN} + ${ROOM}))`,
			left: `calc(-1 * max(${SIDE}, ${ROOM}))`,
			right: `calc(-1 * max(${SIDE}, ${ROOM}))`,
		},
	},
	/** Words with a letter below their baseline, reached down to it. */
	descends: { '::after': { bottom: `calc(-1 * (${DOWN} + ${ROOM} + ${DESCENDER}))` } },
});
