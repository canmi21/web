/**
 * The scale's type sizes, smallest first, each with the line it sets on the sizes page: the values
 * are `@canmi/design/scale.stylex`'s, written again here since a StyleX const is read in a style,
 * not in a page's data -- RFC wb3ro.
 */

/** Where a size stands: the interface, text to be read, or a heading. */
export type Kind = 'interface' | 'reading' | 'heading';

export interface Size {
	/** Its name in the scale, `fontSize.{name}`. */
	readonly name: string;
	readonly rem: number;
	readonly kind: Kind;
	/** The line its card sets, one for every size on that card, so they are told apart by size. */
	readonly sample: string;
}

export const SIZES: readonly Size[] = [
	{ name: 'caption', rem: 0.75, kind: 'interface', sample: 'Deploy to production' },
	{ name: 'label', rem: 0.8125, kind: 'interface', sample: 'Deploy to production' },
	{ name: 'body', rem: 0.875, kind: 'interface', sample: 'Deploy to production' },
	{
		name: 'prose',
		rem: 1,
		kind: 'reading',
		sample:
			'A sentence meant to be read is set at the size the reader chose for their browser, with room between its lines.',
	},
	{ name: 'title', rem: 1.25, kind: 'heading', sample: 'Overview' },
	{ name: 'headline', rem: 1.5, kind: 'heading', sample: 'Overview' },
	{ name: 'display', rem: 2, kind: 'heading', sample: 'Overview' },
];

/** How a size is copied, as code reads it. */
export const constOf = (size: Size) => `fontSize.${size.name}`;
