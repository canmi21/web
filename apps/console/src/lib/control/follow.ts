/**
 * A task followed until it is done or failed: its record read again past the edge's cache, sooner
 * at first and further apart after, each read handed on as it lands. A service tells the ledger and
 * never waits on it, so a task not there yet is asked again rather than reported missing.
 * Platform's spec/architecture/ledger.md, "Pushed to, never asking".
 */
import { ask } from '../facets.ts';
import type { Control, TaskDetail, TaskState } from './types.ts';

export interface Following {
	signal?: AbortSignal;
	/** Each read of the task as it lands, the last one done or failed. */
	onUpdate?: (task: TaskDetail) => void;
	/** How long to follow before giving up, in milliseconds. */
	within?: number;
	/** How the task is read; the `task` facet, past the cache, unless a test hands its own. */
	read?: (service: string, id: string) => Promise<Control<TaskDetail> | undefined>;
}

/** The first wait and the longest, in milliseconds. */
const FIRST = 250;
const LONGEST = 4000;

const settled = (state: TaskState) => state === 'done' || state === 'failed';

const askTask = (service: string, id: string) => ask('task', { service, id }, { fresh: true });

function paused(ms: number, signal: AbortSignal | undefined): Promise<void> {
	return new Promise((resolve) => {
		const timer = setTimeout(resolve, ms);
		const stop = () => {
			clearTimeout(timer);
			resolve();
		};
		signal?.addEventListener('abort', stop, { once: true });
	});
}

/**
 * The task `service` and `id` name, once done or failed; or the last read of it, or why there was
 * none, when `within` runs out or `signal` aborts first.
 */
export async function follow(
	service: string,
	id: string,
	{ signal, onUpdate, within = 60_000, read = askTask }: Following = {},
): Promise<Control<TaskDetail>> {
	const until = Date.now() + within;
	let wait = FIRST;
	let last: Control<TaskDetail> = {
		ok: false,
		failure: { status: 504, code: 'no_such_task', message: 'The task has not been recorded yet.' },
	};
	for (;;) {
		if (signal?.aborted) break;
		const answer = await read(service, id);
		if (answer?.ok) {
			last = answer;
			onUpdate?.(answer.data);
			if (settled(answer.data.state)) return answer;
		} else if (answer && answer.failure.code !== 'no_such_task') {
			// The ledger refused or did not answer: asked again only while time is left.
			last = answer;
		}
		if (Date.now() + wait > until) break;
		await paused(wait, signal);
		wait = Math.min(wait * 2, LONGEST);
	}
	return last;
}
