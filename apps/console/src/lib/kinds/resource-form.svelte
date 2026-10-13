<script lang="ts">
	/**
	 * A resource's form from its kind's fields: creating one by its name, or changing one by the
	 * least patch, held to the revision it was read at. The browser sends it to the console's own
	 * `/api/`, src/lib/control/write.ts; what came back is said under it and its task followed to
	 * done, the page read again once it is. A secret's field is cleared once sent.
	 */
	import { invalidateAll } from '$app/navigation';
	import type { Description } from '../control/catalog.gen.ts';
	import { patchOf } from '../control/patch.ts';
	import { REGISTRY_SERVICE, type Resource, type Written } from '../control/types.ts';
	import { create, patch } from '../control/write.ts';
	import Button from '../ui/button.svelte';
	import FieldInput from './field-input.svelte';
	import { type Options, edited, read } from './form.ts';
	import TaskFollow from './task-follow.svelte';

	let {
		description,
		resource,
		options,
	}: {
		description: Description;
		/** The resource as read; absent, the form creates one. */
		resource?: Resource;
		options: Options;
	} = $props();

	const creating = $derived(resource === undefined);
	let busy = $state(false);
	let problems: { missing: string[]; invalid: string[] } | undefined = $state();
	let written: Written | undefined = $state();

	async function submit(event: SubmitEvent & { currentTarget: HTMLFormElement }) {
		event.preventDefault();
		const form = event.currentTarget;
		const sent = new FormData(form);
		const reading = read(description.fields, sent, 'spec', creating);
		const name = String(sent.get('name') ?? '').trim();
		if (creating && !name) reading.missing.unshift('name');
		written = undefined;
		problems = reading.missing.length || reading.invalid.length ? reading : undefined;
		if (problems) return;
		busy = true;
		written = resource
			? await patch(
					description.name,
					resource.id,
					resource.revision,
					patchOf(resource.spec, edited(resource.spec, reading.spec, description.fields)),
				)
			: await create(description.name, name, reading.spec);
		busy = false;
		for (const field of form.querySelectorAll('input[type="password"]')) {
			if (field instanceof HTMLInputElement) field.value = '';
		}
	}
</script>

<form onsubmit={submit} aria-busy={busy}>
	{#if creating}
		<p>
			<label for="field-name">name</label>
			<input id="field-name" name="name" type="text" required />
		</p>
	{/if}
	{#each description.fields as field (field.name)}
		<FieldInput {field} prefix="spec" value={resource?.spec[field.name]} {options} {creating} />
	{/each}
	<p>
		<Button type="submit" variant="primary" disabled={busy}>
			{creating ? `Create ${description.name}` : 'Save'}
		</Button>
	</p>
	{#if problems}
		<p role="alert">
			{#if problems.missing.length}Required: {problems.missing.join(', ')}.{/if}
			{#if problems.invalid.length}Not readable: {problems.invalid.join(', ')}.{/if}
		</p>
	{:else if written && !written.ok}
		<p role="alert">{written.failure.message} ({written.failure.code})</p>
	{:else if written && 'unchanged' in written}
		<p role="status">Nothing to change.</p>
	{:else if written && 'task' in written}
		<TaskFollow service={REGISTRY_SERVICE} id={written.task} onsettled={() => invalidateAll()} />
	{/if}
</form>
