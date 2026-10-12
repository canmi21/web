/**
 * Each part of canmi.app by its first path segment: the binding it is reached through, and how far
 * it reaches when it is not yet published -- in development alone, or nowhere. See
 * spec/architecture/space.md.
 */
export const PARTS = {
	design: { binding: 'DESIGN' },
	rfcs: { binding: 'RFCS', reach: 'nowhere' },
} as const satisfies Record<string, { binding: string; reach?: Reach }>;

/** How far an unpublished part reaches: development alone, or nowhere until its pages are drawn. */
export type Reach = 'development' | 'nowhere';

export type Binding = (typeof PARTS)[keyof typeof PARTS]['binding'];

/** Whether a part is reached, in development or not. */
export const reached = (part: { binding: string; reach?: Reach }, dev: boolean): boolean =>
	part.reach === undefined || (part.reach === 'development' && dev);
