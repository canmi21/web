<script lang="ts">
	/**
	 * Every resource of a kind, under the columns the catalog says a list shows first, each row a
	 * link to the resource. References are written as the name of what they name where it is known.
	 */
	import type { Description } from '../control/catalog.gen.ts';
	import type { Resource } from '../control/types.ts';
	import DataTable from '../table/data-table.svelte';
	import type { Column } from '../table/table.ts';
	import { type Options, shown } from './form.ts';

	let {
		description,
		items,
		options = {},
		href,
	}: {
		description: Description;
		items: Resource[];
		/** The resources references name, to write a name for an id. */
		options?: Options;
		href: (resource: Resource) => string;
	} = $props();

	const cell = (resource: Resource, key: string): string => {
		const field = description.fields.find((one) => one.name === key);
		const value = resource.spec[key];
		const named = field?.kind && options[field.kind]?.find((one) => one.value === value)?.label;
		return named ?? shown(value);
	};

	const columns: Column<Resource>[] = $derived([
		{ key: 'name', label: 'name', value: (row) => row.name },
		...description.columns.map((key) => ({
			key,
			label: key,
			value: (row: Resource) => cell(row, key),
		})),
	]);
</script>

<DataTable
	rows={items}
	{columns}
	key={(row) => row.id}
	{href}
	label="Every {description.name}"
	sort={{ key: 'name', direction: 'ascending' }}
	empty="No {description.name} yet"
/>
