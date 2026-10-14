<script lang="ts">
	/**
	 * What a write came back with, said under what made it: the registry's refusal with its code,
	 * nothing to change, or its task followed until it is done or failed.
	 */
	import { REGISTRY_SERVICE, type TaskDetail, type Written } from '../control/types.ts';
	import TaskFollow from './task-follow.svelte';

	let {
		written,
		onsettled,
	}: { written: Written | undefined; onsettled?: (task: TaskDetail) => void } = $props();
</script>

{#if written && !written.ok}
	<p role="alert">{written.failure.message} ({written.failure.code})</p>
{:else if written && 'unchanged' in written}
	<p role="status">Nothing to change.</p>
{:else if written && 'task' in written}
	{#key written.task}
		<TaskFollow service={REGISTRY_SERVICE} id={written.task} {onsettled} />
	{/key}
{/if}
