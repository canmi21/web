<script lang="ts">
	/**
	 * Every resource of a kind, under the columns the catalog says a list shows first, each row a
	 * link to the resource; one with no name is its first column and short id, linked by its id.
	 * References are written as what they name is called where it is known, a masked value as dots.
	 */
	import type { Description } from '../control/catalog.gen.ts';
	import type { Resource } from '../control/types.ts';
	import DataTable from '../table/data-table.svelte';
	import type { Column } from '../table/table.ts';
	import { DOTS } from '../ui/masked.svelte';
	import { type Options, shown } from './form.ts';
	import { labelOf, refOf } from './view.ts';

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
		/** Where a resource is read, by its name, or its id where its kind has none. */
		href: (ref: string) => string;
	} = $props();

	const cell = (resource: Resource, key: string): string => {
		const field = description.fields.find((one) => one.name === key);
		const value = resource.spec[key];
		const named = field?.kind && options[field.kind]?.find((one) => one.value === value)?.label;
		return named ?? shown(value);
	};

	const masked = (key: string) => description.fields.some((one) => one.name === key && one.masked);

	/**
	 * A masked column is dots, sorting and searching by nothing so neither tells what it hides; it
	 * is shown on the resource's own page, since a row is one link and nothing in it is pressed.
	 */
	const columns: Column<Resource>[] = $derived([
		description.named
			? { key: 'name', label: 'name', value: (row) => row.name ?? row.id }
			: { key: 'id', label: description.name, value: (row) => labelOf(description, row) },
		...description.columns.map((key) =>
			masked(key)
				? {
						key,
						label: key,
						value: () => '',
						text: () => DOTS,
						sortable: false,
						filterable: false,
					}
				: { key, label: key, value: (row: Resource) => cell(row, key) },
		),
	]);
</script>

<DataTable
	rows={items}
	{columns}
	key={(row) => row.id}
	href={(row) => href(refOf(description, row))}
	label="Every {description.name}"
	sort={{ key: description.named ? 'name' : 'id', direction: 'ascending' }}
	empty="No {description.name} yet"
/>
