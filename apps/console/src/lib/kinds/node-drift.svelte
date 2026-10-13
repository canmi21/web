<script lang="ts">
	/**
	 * A node's drift as its host reports it: what the registry wants there and does not run, what
	 * runs and is not wanted, and what runs another release than the one wanted. Drawn, never worked
	 * out here -- infra's spec/architecture/host.md.
	 */
	import Card from '../card.svelte';
	import type { Control, Drift } from '../control/types.ts';
	import { localTime } from '../format.ts';
	import { scoped } from '../scope/context.ts';
	import Skeleton from '../ui/skeleton.svelte';
	import { timeZone } from '../ui/time-zone.ts';
	import Failed from './failed.svelte';

	let { read }: { read: Control<Drift> | Promise<Control<Drift>> } = $props();

	const zone = timeZone();
	const { app } = scoped();
	const ran = (one: { run: number; commit?: string } | undefined) =>
		one === undefined ? 'no run' : `#${one.run}${one.commit ? ` ${one.commit.slice(0, 7)}` : ''}`;
</script>

{#await read}
	<Card title="Drift"><Skeleton height={240} label="Loading the drift" /></Card>
{:then answer}
	{#if !answer.ok}
		<Failed what="The drift" failure={answer.failure} />
	{:else}
		{@const drift = answer.data}
		<Card title="Drift">
			<p>
				Against the registry's revision {drift.registry_revision}, read
				<time datetime={drift.read_at}>{localTime(drift.read_at, zone)}</time>
				{drift.source === 'cache'
					? 'from what host kept, no registry answering'
					: 'from the registry'}.
			</p>
			<section aria-labelledby="drift-wanted">
				<h3 id="drift-wanted">Wanted, not running</h3>
				{#if drift.wanted_not_running?.length}
					<ul>
						{#each drift.wanted_not_running as name (name)}<li>
								<a href={app(name)}>{name}</a>
							</li>{/each}
					</ul>
				{:else}<p>None.</p>{/if}
			</section>
			<section aria-labelledby="drift-unwanted">
				<h3 id="drift-unwanted">Running, not wanted</h3>
				{#if drift.running_not_wanted?.length}
					<ul>
						{#each drift.running_not_wanted as name (name)}<li>
								<a href={app(name)}>{name}</a>
							</li>{/each}
					</ul>
				{:else}<p>None.</p>{/if}
			</section>
			<section aria-labelledby="drift-behind">
				<h3 id="drift-behind">Behind</h3>
				{#if drift.release_behind?.length}
					<ul>
						{#each drift.release_behind as one (one.app)}
							<li>
								<a href={app(one.app)}>{one.app}</a>: wanted {ran(one.wanted)}, running
								{ran(one.running)}
							</li>
						{/each}
					</ul>
				{:else}<p>None.</p>{/if}
			</section>
		</Card>
	{/if}
{/await}
