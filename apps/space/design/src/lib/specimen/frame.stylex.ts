/**
 * A specimen card's inset, the same on every side. The card keeps the console's card's `radius.xl`;
 * the box in it stands further in than that corner reaches, so it holds a step of its own, `lg`,
 * rather than one worked out from the card's -- lib's spec/design/styles.md, "Of two corners
 * nested". See spec/architecture/space.md, "Specimens are laid on paper".
 */
import * as stylex from '@stylexjs/stylex';

export const frame = stylex.defineConsts({ inset: '1.25rem' });
