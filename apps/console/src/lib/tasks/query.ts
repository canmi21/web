/**
 * What the Tasks page is narrowed by, as its query says it -- a service, a state, a kind, and
 * where the page starts -- passed to the ledger as it is, which forgives what it cannot read.
 * Platform's spec/architecture/ledger.md, "Read by the console".
 */
import type { TaskQuery, TaskState } from '../control/types.ts';

export const STATES: readonly TaskState[] = ['queued', 'running', 'done', 'failed'];
const KEYS = ['service', 'state', 'kind', 'before'] as const;

/** How many tasks a page holds. */
export const LIMIT = 50;

export function taskQueryOf(query: Pick<URLSearchParams, 'get'>): TaskQuery {
	const out: TaskQuery = { limit: String(LIMIT) };
	for (const key of KEYS) {
		const value = query.get(key)?.trim();
		if (value) out[key] = value;
	}
	return out;
}

/** The query for `asked`, writing only what narrows it; `limit` is the page's own. */
export function taskHref(asked: TaskQuery): string {
	const query = new URLSearchParams();
	for (const key of KEYS) {
		const value = asked[key];
		if (value) query.set(key, value);
	}
	const text = query.toString();
	return text ? `?${text}` : '?';
}
