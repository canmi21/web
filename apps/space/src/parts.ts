/**
 * Each part of canmi.app by its first path segment: the binding it is reached through, and whether
 * it is reached in development alone, as a part not yet published is. See
 * spec/architecture/space.md.
 */
export const PARTS = {
	design: { binding: 'DESIGN' },
	rfcs: { binding: 'RFCS', development: true },
} as const satisfies Record<string, { binding: string; development?: true }>;

export type Binding = (typeof PARTS)[keyof typeof PARTS]['binding'];
