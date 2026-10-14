<script lang="ts">
	/**
	 * The nodes under an account, each detached by a write of its `account` where the node kind lets
	 * it go without one, and any other attached the same way -- one under another account moved only
	 * once the reader says so. Each write is held to the revision the node was read at, and its task
	 * followed. spec/console/navigation.md.
	 */
	import { invalidateAll } from '$app/navigation';
	import Card from '../card.svelte';
	import type { Description } from '../control/catalog.gen.ts';
	import type { Resource, Written as Outcome } from '../control/types.ts';
	import { patch } from '../control/write.ts';
	import DataTable from '../table/data-table.svelte';
	import type { Column } from '../table/table.ts';
	import Button from '../ui/button.svelte';
	import { accountPatch, candidatesFor, detachable } from './account.ts';
	import { type Options, shown } from './form.ts';
	import { refOf } from './view.ts';
	import Written from './written.svelte';

	let {
		kind,
		items,
		options,
		others,
		account,
		href,
	}: {
		/** The node kind, as the catalog describes it. */
		kind: Description;
		/** The nodes under this account. */
		items: Resource[];
		options: Options;
		/** Every other node, which may be attached here. */
		others: Resource[];
		account: string;
		href: (name: string) => string;
	} = $props();

	let chosen = $state('');
	/** A node under another account the reader picked, waiting to be told it moves. */
	let moving: Resource | undefined = $state();
	let busy = $state(false);
	let written: Outcome | undefined = $state();

	const candidates = $derived(candidatesFor(others, account));
	const nameOf = (node: Resource) => node.name ?? node.id;

	/** What the account a node is under is called, as the node kind's picker names it. */
	const under = (node: Resource) =>
		options.account?.find((one) => one.value === node.spec.account)?.label ??
		String(node.spec.account);

	/** A node's column as written: a reference by what it names is called. */
	function said(node: Resource, key: string): string {
		const field = kind.fields.find((one) => one.name === key);
		const value = node.spec[key];
		const named = field?.kind && options[field.kind]?.find((one) => one.value === value)?.label;
		return named ?? shown(value);
	}

	async function write(node: Resource, id: string | null) {
		busy = true;
		moving = undefined;
		written = await patch(kind.name, refOf(kind, node), node.revision, accountPatch(id));
		busy = false;
		chosen = '';
	}

	function attach(event: SubmitEvent) {
		event.preventDefault();
		const picked = candidates.find((one) => one.node.id === chosen);
		if (!picked) return;
		if (picked.moves) moving = picked.node;
		else void write(picked.node, account);
	}

	/** The node kind's columns but `account`, which every row here shares, after its name. */
	const columns: Column<Resource>[] = $derived([
		{ key: 'name', label: 'name', value: nameOf, cell: named },
		...kind.columns
			.filter((key) => key !== 'account')
			.map((key) => ({ key, label: key, value: (row: Resource) => said(row, key) })),
		...(detachable(kind)
			? [
					{
						key: 'detach',
						label: 'detach',
						value: () => '',
						sortable: false,
						filterable: false,
						cell: detach,
					},
				]
			: []),
	]);
</script>

{#snippet named(row: Resource)}
	<a href={href(nameOf(row))}>{nameOf(row)}</a>
{/snippet}

{#snippet detach(row: Resource)}
	<Button disabled={busy} onclick={() => write(row, null)}>Detach {nameOf(row)}</Button>
{/snippet}

<Card title="Nodes under this account" flush>
	<DataTable
		rows={items}
		{columns}
		key={(row) => row.id}
		label="Nodes under this account"
		sort={{ key: 'name', direction: 'ascending' }}
		empty="No node is under this account"
	/>
</Card>
<Card title="Attach a node">
	{#if candidates.length === 0}
		<p>Every node is under this account.</p>
	{:else}
		<form onsubmit={attach}>
			<p>
				<label for="attach-node">node</label>
				<select id="attach-node" bind:value={chosen} required>
					<option value="">Choose</option>
					{#each candidates as { node, moves } (node.id)}
						<option value={node.id}>
							{nameOf(node)}, {moves ? `under ${under(node)}` : 'under none'}
						</option>
					{/each}
				</select>
			</p>
			{#if moving}
				{@const node = moving}
				<p role="alert">{nameOf(node)} is under {under(node)}. Attaching it here moves it.</p>
				<p>
					<Button variant="primary" disabled={busy} onclick={() => write(node, account)}>
						Move it here
					</Button>
					<Button onclick={() => (moving = undefined)}>Cancel</Button>
				</p>
			{:else}
				<p>
					<Button type="submit" variant="primary" disabled={busy || !chosen}>Attach node</Button>
				</p>
			{/if}
		</form>
	{/if}
	<Written {written} onsettled={() => void invalidateAll()} />
</Card>
