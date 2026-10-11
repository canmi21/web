/**
 * The color each verdict is drawn in, slot, legend and tip alike: nothing a step off the card, fine
 * green, planned busy blue, degraded amber, down red. See spec/console/overview.md, "A line
 * is any of three things, or the worst of them".
 */
import * as stylex from '@stylexjs/stylex';

export const painted = stylex.create({
	none: { backgroundColor: 'color-mix(in srgb, var(--foreground-default) 9%, transparent)' },
	fine: { backgroundColor: 'var(--status-success)' },
	planned: { backgroundColor: 'var(--status-info)' },
	degraded: { backgroundColor: 'var(--status-warning)' },
	down: { backgroundColor: 'var(--status-critical)' },
});
