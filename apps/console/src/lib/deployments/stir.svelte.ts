/**
 * Whether the runs a page shows may have moved: a node's runs version on the live store changed
 * within the last STIRRED, long enough for a read made after it to pass the edge's five seconds of
 * runs. A page reads again while it holds, as it does while a run deploys; see ./fresh.svelte.ts.
 * Made while a component starts, since it owns an effect.
 */
import { untrack } from 'svelte';
import { runsOf } from '../view.ts';
import type { Entry } from '../wire.ts';

const STIRRED = 10_000;

export class Stirred {
	moved = $state(false);

	constructor(nodes: () => Readonly<Record<string, Entry>>) {
		let held = untrack(() => runsOf(nodes()));
		let timer: ReturnType<typeof setTimeout> | undefined;
		$effect(() => {
			const runs = runsOf(nodes());
			if (runs === held) return;
			held = runs;
			this.moved = true;
			clearTimeout(timer);
			timer = setTimeout(() => (this.moved = false), STIRRED);
		});
		$effect(() => () => clearTimeout(timer));
	}
}
