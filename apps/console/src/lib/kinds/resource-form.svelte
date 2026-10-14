<script lang="ts">
	/**
	 * A resource's form from its kind's fields: creating one by its name, or changing one by the
	 * least patch, held to the revision it was read at. The browser sends it to the console's own
	 * `/api/`, src/lib/control/write.ts; what came back is said under it and its task followed to
	 * done, the page read again once it is -- or, for a kind with no name, the new one's own page
	 * opened by the id the registry drew, RFC 32hd9. A secret's field is cleared once sent.
	 */
	import { goto, invalidateAll } from '$app/navigation';
	import type { Description } from '../control/catalog.gen.ts';
	import { patchOf } from '../control/patch.ts';
	import type { Resource, Written as Outcome } from '../control/types.ts';
	import { create, patch } from '../control/write.ts';
	import Button from '../ui/button.svelte';
	import FieldInput from './field-input.svelte';
	import { type Options, edited, read } from './form.ts';
	import Written from './written.svelte';

	let {
		description,
		resource,
		options,
		created,
	}: {
		description: Description;
		/** The resource as read; absent, the form creates one. */
		resource?: Resource;
		options: Options;
		/** Where a resource made with no name is read, by the id the registry answered. */
		created?: (id: string) => string;
	} = $props();

	/** The new resource's page once its task is settled, or this page read again. */
	function settled() {
		const id = written?.ok && 'id' in written ? written.id : undefined;
		if (id !== undefined && created) void goto(created(id));
		else void invalidateAll();
	}

	const creating = $derived(resource === undefined);
	let busy = $state(false);
	let problems: { missing: string[]; invalid: string[] } | undefined = $state();
	let written: Outcome | undefined = $state();

	async function submit(event: SubmitEvent & { currentTarget: HTMLFormElement }) {
		event.preventDefault();
		const form = event.currentTarget;
		const sent = new FormData(form);
		const reading = read(description.fields, sent, 'spec', creating);
		const name = String(sent.get('name') ?? '').trim();
		if (creating && description.named && !name) reading.missing.unshift('name');
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
			: await create(description.name, description.named ? name : undefined, reading.spec);
		busy = false;
		// A secret's alone: a masked field is a password input while hidden, and keeps what it holds.
		for (const field of form.querySelectorAll('input[data-secret]')) {
			if (field instanceof HTMLInputElement) field.value = '';
		}
	}
</script>

<form onsubmit={submit} aria-busy={busy}>
	{#if creating && description.named}
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
	{:else}
		<Written {written} onsettled={settled} />
	{/if}
</form>
