import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { follow } from './follow.ts';
import type { Control, TaskDetail, TaskState } from './types.ts';

const detail = (state: TaskState): Control<TaskDetail> => ({
	ok: true,
	data: {
		service: 'registry',
		id: 'abcdef0123456789',
		kind: 'write',
		state,
		caller: 'ours',
		asked_at: '2026-10-13T00:00:00Z',
		summary: null,
		updated_at: '2026-10-13T00:00:00Z',
		events: [],
		children: [],
	},
});

const missing: Control<TaskDetail> = {
	ok: false,
	failure: { status: 404, code: 'no_such_task', message: 'No such task.' },
};

/** A ledger answering each of `answers` in turn, the last one ever after. */
function ledger(...answers: (Control<TaskDetail> | undefined)[]) {
	let asked = 0;
	const read = vi.fn(async () => answers[Math.min(asked++, answers.length - 1)]);
	return read;
}

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe('a task, followed', () => {
	it('is read until it is done, each read handed on as it lands', async () => {
		const read = ledger(missing, detail('running'), detail('done'));
		const states: TaskState[] = [];
		const following = follow('registry', 'abcdef0123456789', {
			read,
			onUpdate: (task) => states.push(task.state),
		});
		await vi.runAllTimersAsync();
		const done = await following;
		expect(done.ok && done.data.state).toBe('done');
		expect(states).toEqual(['running', 'done']);
		expect(read).toHaveBeenCalledTimes(3);
		expect(read).toHaveBeenCalledWith('registry', 'abcdef0123456789');
	});

	it('ends on failed as on done', async () => {
		const following = follow('registry', 'x', { read: ledger(detail('failed')) });
		await vi.runAllTimersAsync();
		expect((await following).ok).toBe(true);
	});

	it('gives the last read once its time runs out, never a task still running as settled', async () => {
		const read = ledger(detail('running'));
		const following = follow('registry', 'x', { read, within: 5000 });
		await vi.runAllTimersAsync();
		const last = await following;
		expect(last.ok && last.data.state).toBe('running');
		// 250, 500, 1000 and 2000 ms between reads fit in five seconds; 4000 more does not.
		expect(read).toHaveBeenCalledTimes(5);
	});

	it('says the task was never recorded where the ledger never had it', async () => {
		const following = follow('registry', 'x', { read: ledger(missing), within: 1000 });
		await vi.runAllTimersAsync();
		const last = await following;
		expect(!last.ok && last.failure.code).toBe('no_such_task');
	});

	it('stops at once when aborted', async () => {
		const stop = new AbortController();
		const read = ledger(detail('running'));
		const following = follow('registry', 'x', { read, signal: stop.signal });
		await vi.advanceTimersByTimeAsync(0);
		stop.abort();
		await vi.runAllTimersAsync();
		await following;
		expect(read).toHaveBeenCalledTimes(1);
	});
});
