<script lang="ts">
	/**
	 * A write's task followed until it is done or failed, src/lib/control/follow.ts, and said as it
	 * moves, with a link to its whole record; `onsettled` once it is either. One not done when the
	 * following gives up is still linked, so the reader can follow it on its page.
	 */
	import { onMount } from 'svelte';
	import { follow } from '../control/follow.ts';
	import type { Control, TaskDetail } from '../control/types.ts';
	import { scoped } from '../scope/context.ts';

	let {
		service,
		id,
		onsettled,
	}: { service: string; id: string; onsettled?: (task: TaskDetail) => void } = $props();

	const { to } = scoped();
	let task: TaskDetail | undefined = $state();
	let last: Control<TaskDetail> | undefined = $state();

	onMount(() => {
		const stop = new AbortController();
		void follow(service, id, { signal: stop.signal, onUpdate: (one) => (task = one) }).then(
			(answer) => {
				if (stop.signal.aborted) return;
				last = answer;
				if (answer.ok && (answer.data.state === 'done' || answer.data.state === 'failed'))
					onsettled?.(answer.data);
			},
		);
		return () => stop.abort();
	});
</script>

<p role="status" aria-live="polite">
	Task <a href={to(`/tasks/${encodeURIComponent(service)}/${encodeURIComponent(id)}`)}>{id}</a>:
	{task?.state ?? 'asked'}{#if task?.detail}, {task.detail}{/if}{#if last && !last.ok}, not followed
		further: {last.failure.message}{/if}.
</p>
