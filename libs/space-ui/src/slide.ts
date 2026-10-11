/**
 * The sidebar moving between levels, as the console's does: spec/console/navigation.md, "Entering
 * a level replaces the sidebar with it". Nothing moves for a reader who asks for reduced motion.
 */
import { gsap } from 'gsap';

/** Whether this reader has asked for less motion; true on the server, which draws no motion. */
function stilled(): boolean {
	return (
		typeof window === 'undefined' || window.matchMedia('(prefers-reduced-motion: reduce)').matches
	);
}

/** How far a level travels as it gives way, in pixels. */
const STEP = 24;

/**
 * `ghost`, a copy of the level left, slides off toward the side it is left by and is removed, and
 * `panel`, the level now drawn, arrives from the other. `way` is 1 going deeper, so the old goes
 * left and the new comes from the right, and -1 coming back up.
 */
export function pass(ghost: HTMLElement, panel: HTMLElement, way: 1 | -1): void {
	if (stilled()) {
		ghost.remove();
		return;
	}
	gsap
		.timeline()
		.to(
			ghost,
			{
				x: -STEP * way,
				autoAlpha: 0,
				duration: 0.14,
				ease: 'power2.in',
				onComplete: () => ghost.remove(),
			},
			0,
		)
		.fromTo(
			panel,
			{ x: STEP * way, autoAlpha: 0 },
			{
				x: 0,
				autoAlpha: 1,
				duration: 0.18,
				ease: 'power2.out',
				clearProps: 'transform,opacity,visibility',
			},
			0.06,
		);
}
