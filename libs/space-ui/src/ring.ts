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
	 * any words do, and only the ring reaches down past the letters that fall.
	 */
	descends: { '::before': { bottom: `calc(-1 * ${ROOM} - ${DESCENDER})` } },
	/** The ring at rest, for a page that shows it: on a control, and on words through their host. */
	shownControl: { outlineWidth: WIDTH },
	shownWords: { '--ring': WIDTH },
});

/** Whether words have a letter that falls below their baseline. */
export const descends = (words: string) => /[gjpqy]/.test(words);
