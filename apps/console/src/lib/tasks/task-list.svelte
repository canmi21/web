<script lang="ts">
	/**
	 * The ledger's tasks, newest first, under the filters that narrowed them, each row a link to the
	 * task's own page, and the page after this one where there is one.
	 */
	import type { Listed, TaskQuery } from '../control/types.ts';
	import { localTime } from '../format.ts';
	import { took } from '../events/duration.ts';
	import { scoped } from '../scope/context.ts';
	import DataTable from '../table/data-table.svelte';
	import type { Column } from '../table/table.ts';
	import Button from '../ui/button.svelte';
	import { timeZone } from '../ui/time-zone.ts';
	import { STATES, taskHref } from './query.ts';

	let { items, asked, next }: { items: Listed[]; asked: TaskQuery; next?: string } = $props();

	const zone = timeZone();
	const { to } = scoped();
	const hrefOf = (one: Listed) =>
		to(`/tasks/${encodeURIComponent(one.service)}/${encodeURIComponent(one.id)}`);

	const columns: Column<Listed>[] = [
		{
			key: 'asked',
			label: 'asked',
			value: (row) => Date.parse(row.asked_at),
			text: (row) => localTime(row.asked_at, zone),
		},
		{ key: 'service', label: 'service', value: (row) => row.service },
		{ key: 'kind', label: 'kind', value: (row) => row.kind },
		{ key: 'state', label: 'state', value: (row) => row.state },
		{
			key: 'took',
			label: 'took',
			value: (row) => took(row.started_at ?? row.asked_at, row.finished_at),
		},
		{ key: 'id', label: 'id', value: (row) => row.id },
	];
</script>

<form method="GET" aria-label="Narrow the tasks">
	<p>
		<label for="tasks-service">service</label>
		<input id="tasks-service" name="service" type="text" value={asked.service ?? ''} />
	</p>
	<p>
		<label for="tasks-state">state</label>
		<select id="tasks-state" name="state">
			<option value="" selected={!asked.state}>Any</option>
			{#each STATES as state (state)}
				<option value={state} selected={asked.state === state}>{state}</option>
			{/each}
		</select>
	</p>
	<p>
		<label for="tasks-kind">kind</label>
		<input id="tasks-kind" name="kind" type="text" value={asked.kind ?? ''} />
	</p>
	<p><Button type="submit">Narrow</Button></p>
</form>

<DataTable
	rows={items}
	{columns}
	key={(row) => `${row.service} ${row.id}`}
	href={hrefOf}
	label="Tasks, newest first"
	filterable={false}
	size={items.length || 1}
	empty="No task asked yet"
/>

<nav aria-label="Pages of tasks">
	{#if asked.before}<a href={taskHref({ ...asked, before: undefined })}>Newest</a>{/if}
	{#if next}<a href={taskHref({ ...asked, before: next })}>Older</a>{/if}
</nav>
