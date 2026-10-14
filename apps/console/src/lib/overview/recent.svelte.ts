/**
 * The view's steps of the last day, read from the runs: asked once the page is up, then again past
 * the edge's cache each time a node's runs move on the live store, at most every EVERY. A snapshot
 * carries no events since platform's RFC grmtb, so this is what keeps the overview's verdict and
 * timeline live. Made while a component starts, since it owns an effect.
 */
import { ask } from '../facets.ts';
import type { View } from '../scope/scope.ts';
import { runsOf } from '../view.ts';
import type { Entry } from '../wire.ts';
import type { Step } from './moving.ts';

/** The least time between two asks, in milliseconds: a deploy moves its runs every round. */
const EVERY = 4000;

export class Recent {
	steps = $state.raw<Step[]>([]);
	#view: View | undefined;
	#asked = 0;

	constructor(of: () => { view: View; nodes: Readonly<Record<string, Entry>> }) {
		let held: string | undefined;
		let timer: ReturnType<typeof setTimeout> | undefined;
		$effect(() => {
			const { view, nodes } = of();
			const runs = runsOf(nodes);
			if (runs === held && view === this.#view) return;
			if (view !== this.#view) this.steps = [];
			held = runs;
			this.#view = view;
			clearTimeout(timer);
			timer = setTimeout(
				() => void this.#read(view),
				Math.max(0, this.#asked + EVERY - Date.now()),
			);
		});
		$effect(() => () => clearTimeout(timer));
	}

	async #read(view: View): Promise<void> {
		this.#asked = Date.now();
		const steps = await ask('recent', { view }, { priority: 'low', fresh: true });
		if (steps && view === this.#view) this.steps = steps;
	}
}
