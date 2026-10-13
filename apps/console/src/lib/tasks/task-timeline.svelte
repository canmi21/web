<script lang="ts">
	/**
	 * A task as a timeline: what asked for it and what it asked for, then each step in order, how
	 * long after the one before it came, and where it failed. Platform's spec/architecture/ledger.md,
	 * "Read by the console".
	 */
	import type { Task, TaskDetail } from '../control/types.ts';
	import { took } from '../events/duration.ts';
	import { localTime } from '../format.ts';
	import { shown } from '../kinds/form.ts';
	import { scoped } from '../scope/context.ts';
	import { timeZone } from '../ui/time-zone.ts';

	let { task }: { task: TaskDetail } = $props();

	const zone = timeZone();
	const { to } = scoped();
	const hrefOf = (one: Pick<Task, 'service' | 'id'>) =>
		to(`/tasks/${encodeURIComponent(one.service)}/${encodeURIComponent(one.id)}`);
	/** Each step with the moment of the one before it, the first measured from when it was asked. */
	const steps = $derived(
		task.events.map((event, index) => ({
			event,
			since: took(task.events[index - 1]?.at ?? task.asked_at, event.at),
		})),
	);
</script>

<section aria-labelledby="task-facts">
	<h2 id="task-facts">The task</h2>
	<dl>
		<dt>service</dt>
		<dd>{task.service}</dd>
		<dt>kind</dt>
		<dd>{task.kind}</dd>
		<dt>state</dt>
		<dd>{task.state}</dd>
		<dt>caller</dt>
		<dd>{task.caller}</dd>
		<dt>asked</dt>
		<dd><time datetime={task.asked_at}>{localTime(task.asked_at, zone)}</time></dd>
		{#if task.started_at}
			<dt>started</dt>
			<dd><time datetime={task.started_at}>{localTime(task.started_at, zone)}</time></dd>
		{/if}
		{#if task.finished_at}
			<dt>finished</dt>
			<dd>
				<time datetime={task.finished_at}>{localTime(task.finished_at, zone)}</time>, took
				{took(task.started_at ?? task.asked_at, task.finished_at)}
			</dd>
		{/if}
		{#if task.detail}
			<dt>why it failed</dt>
			<dd>{task.detail}</dd>
		{/if}
		<dt>summary</dt>
		<dd>{shown(task.summary)}</dd>
		{#if task.parent}
			<dt>asked by</dt>
			<dd><a href={hrefOf(task.parent)}>{task.parent.service} {task.parent.id}</a></dd>
		{/if}
	</dl>
</section>

<section aria-labelledby="task-steps">
	<h2 id="task-steps">Steps</h2>
	{#if steps.length}
		<ol>
			{#each steps as { event, since }, index (index)}
				<li>
					<time datetime={event.at}>{localTime(event.at, zone)}</time>
					{#if since}(+{since}){/if}
					{event.stage}, {event.level}: {event.message}
					{#if event.data !== undefined}<code>{shown(event.data)}</code>{/if}
				</li>
			{/each}
		</ol>
	{:else}
		<p>No step recorded yet.</p>
	{/if}
</section>

<section aria-labelledby="task-children">
	<h2 id="task-children">What it asked for</h2>
	{#if task.children.length}
		<ul>
			{#each task.children as child (`${child.service} ${child.id}`)}
				<li><a href={hrefOf(child)}>{child.service} {child.kind} {child.id}</a>, {child.state}</li>
			{/each}
		</ul>
	{:else}
		<p>Nothing.</p>
	{/if}
</section>
