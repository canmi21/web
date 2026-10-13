<script lang="ts">
	/**
	 * One field of a resource's form, drawn from the catalog: a choice as a select, a reference as a
	 * picker of that kind's resources, a list of objects an item at a time, a secret as a password
	 * field never filled from what was read, and the registry's own fields shown and never sent.
	 */
	import { untrack } from 'svelte';
	import type { Field } from '../control/catalog.gen.ts';
	import Button from '../ui/button.svelte';
	import { type Options, filled, inputOf, nameOf, shown } from './form.ts';
	import ItemFields from './item-fields.svelte';

	let {
		field,
		prefix,
		value,
		options,
		creating,
	}: {
		field: Field;
		/** What its input's name starts with: `spec`, or an item's `spec.identities.0`. */
		prefix: string;
		/** What the resource holds for it, when it is read. */
		value: unknown;
		options: Options;
		creating: boolean;
	} = $props();

	const input = $derived(inputOf(field));
	const name = $derived(nameOf(prefix, field));
	const id = $derived(`field-${name.replaceAll('.', '-')}`);
	const choices = $derived(field.kind ? (options[field.kind] ?? []) : []);
	/** A reference to a resource the picker does not offer still shows what it names. */
	const unknown = $derived(
		typeof value === 'string' && value !== '' && !choices.some((one) => one.value === value),
	);
	const chosen = (choice: string) => Array.isArray(value) && value.includes(choice);

	type Item = { key: number; value: Record<string, unknown> };
	const start = untrack(() => (Array.isArray(value) ? value : [])) as Record<string, unknown>[];
	let items: Item[] = $state(start.map((one, key) => ({ key, value: one })));
	let next = $state(start.length);
	const add = () => (items = [...items, { key: next++, value: {} }]);
	const remove = (key: number) => (items = items.filter((one) => one.key !== key));
</script>

{#if input === 'shown'}
	<p>{field.name}: {shown(value)}</p>
{:else if input === 'checkbox'}
	<p>
		<input {id} {name} type="checkbox" checked={value === true} />
		<label for={id}>{field.name}</label>
	</p>
{:else if input === 'checkboxes'}
	<fieldset>
		<legend>{field.name}</legend>
		{#each field.choices ?? [] as choice (choice)}
			<label
				><input {name} type="checkbox" value={choice} checked={chosen(choice)} /> {choice}</label
			>
		{/each}
	</fieldset>
{:else if input === 'items'}
	<fieldset>
		<legend>{field.name}</legend>
		{#each items as item, index (item.key)}
			<fieldset>
				<legend>{field.name} {index + 1}</legend>
				<ItemFields
					fields={field.fields ?? []}
					prefix="{name}.{index}"
					item={item.value}
					{options}
					{creating}
				/>
				<Button onclick={() => remove(item.key)}>Remove {field.name} {index + 1}</Button>
			</fieldset>
		{:else}
			<p>None yet.</p>
		{/each}
		<Button onclick={add}>Add to {field.name}</Button>
	</fieldset>
{:else}
	<p>
		<label for={id}>{field.name}</label>
		{#if input === 'select' || input === 'reference'}
			<select {id} {name} required={field.required}>
				<option value="" selected={value === undefined}>{field.required ? 'Choose' : 'None'}</option
				>
				{#if input === 'select'}
					{#each field.choices ?? [] as choice (choice)}
						<option value={choice} selected={value === choice}>{choice}</option>
					{/each}
				{:else}
					{#if unknown}<option value={String(value)} selected>{String(value)}</option>{/if}
					{#each choices as choice (choice.value)}
						<option value={choice.value} selected={value === choice.value}>{choice.label}</option>
					{/each}
				{/if}
			</select>
		{:else if input === 'json'}
			<textarea {id} {name} required={field.required} aria-describedby="{id}-hint"
				>{filled(field, value)}</textarea
			>
			<span id="{id}-hint">JSON</span>
		{:else if input === 'password'}
			<input
				{id}
				{name}
				type="password"
				autocomplete="new-password"
				required={field.required && creating}
				aria-describedby={creating ? undefined : `${id}-hint`}
			/>
			{#if !creating}<span id="{id}-hint">Left blank, what is held is kept.</span>{/if}
		{:else}
			<input
				{id}
				{name}
				type={input === 'number' ? 'number' : 'text'}
				step={input === 'number' ? 1 : undefined}
				value={filled(field, value)}
				required={field.required}
			/>
		{/if}
	</p>
{/if}
