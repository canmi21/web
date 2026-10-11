/** Each part of canmi.app by its first path segment, and the binding it is reached through. */
export const PARTS = { design: 'DESIGN', rfcs: 'RFCS' } as const;

export type Binding = (typeof PARTS)[keyof typeof PARTS];
