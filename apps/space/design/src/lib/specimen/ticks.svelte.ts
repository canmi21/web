/**
 * A press on a color copies its token as code reads it, `var(--token)`, and ticks the mark it was
 * pressed on for a while: every mark of a color does -- spec/architecture/space.md. Each tick keeps
 * its own clock, so a copy ticks one mark without clearing another.
 */
import { SvelteMap } from 'svelte/reactivity';

export class Ticks {
	#clocks = new SvelteMap<string, ReturnType<typeof setTimeout>>();

	/** Whether the mark `key` names is ticked. */
	has(key: string): boolean {
		return this.#clocks.has(key);
	}

	/** Copy `token` and tick the mark `key` names, from this copy. */
	copy(token: string, key: string): Promise<void> {
		return this.write(`var(${token})`, key);
	}

	/** Copy `text` as it is, a measure's const as code reads it, and tick the mark `key` names. */
	async write(text: string, key: string): Promise<void> {
		await navigator.clipboard.writeText(text);
		clearTimeout(this.#clocks.get(key));
		this.#clocks.set(
			key,
			setTimeout(() => this.#clocks.delete(key), 1200),
		);
	}
}
