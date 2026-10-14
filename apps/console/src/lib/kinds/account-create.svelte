<script lang="ts">
	/**
	 * An account made in two steps: its provider, then one optional value for each kind of identity,
	 * each typed into a masked input, at least one filled and an empty one not sent. Going back and
	 * forth keeps what was typed. Sent by a
	 * `POST`, since an account has no name, and once its task is settled its own page is opened by
	 * the id the registry drew. spec/console/navigation.md, and platform's RFC 32hd9.
	 */
	import { untrack } from 'svelte';
	import type { Description } from '../control/catalog.gen.ts';
	import type { Written as Outcome } from '../control/types.ts';
	import { create } from '../control/write.ts';
	import Button from '../ui/button.svelte';
	import MaskedInput from '../ui/masked-input.svelte';
	import {
		type Draft,
		choicesOf,
		identitiesProblems,
		kindLabel,
		providerProblem,
		specOf,
		stepsOf,
	} from './account.ts';
	import Written from './written.svelte';

	let {
		description,
		onmade,
		start,
	}: {
		description: Description;
		/** Once its task is settled, with the id the registry answered: its page opened. */
		onmade?: (id: string) => void;
		/** The step and the draft it opens on, which a test draws the second step from. */
		start?: { step: 1 | 2; draft: Draft };
	} = $props();

	const steps = $derived(stepsOf(description));
	const kinds = $derived(steps ? choicesOf(steps.kind) : []);

	let step: 1 | 2 = $state(untrack(() => start?.step ?? 1));
	/** Every kind blank, then what the draft it opens on holds, so each input is bound to a value. */
	let draft: Draft = $state(
		untrack(() => {
			const blank = Object.fromEntries(kinds.map((kind) => [kind, '']));
			return {
				provider: start?.draft.provider ?? '',
				values: { ...blank, ...start?.draft.values },
			};
		}),
	);
	let problems: string[] = $state([]);
	let busy = $state(false);
	let written: Outcome | undefined = $state();

	function forward() {
		if (!steps) return;
		const problem = providerProblem(draft, steps.provider);
		problems = problem === undefined ? [] : [problem];
		if (problem !== undefined) return;
		step = 2;
	}

	function back() {
		problems = [];
		step = 1;
	}

	async function submit(event: SubmitEvent) {
		event.preventDefault();
		if (step === 1) return forward();
		problems = identitiesProblems(draft, kinds);
		if (problems.length > 0) return;
		busy = true;
		written = await create(description.name, undefined, specOf(draft, kinds));
		busy = false;
	}

	function settled() {
		const id = written?.ok && 'id' in written ? written.id : undefined;
		if (id !== undefined) onmade?.(id);
	}
</script>

{#if !steps}
	<p role="alert">The catalog does not describe an account's provider and identities.</p>
{:else}
	<form onsubmit={submit} aria-busy={busy}>
		<ol aria-label="Steps">
			<li aria-current={step === 1 ? 'step' : undefined}>{steps.provider.name}</li>
			<li aria-current={step === 2 ? 'step' : undefined}>{steps.identities.name}</li>
		</ol>
		{#if step === 1}
			<p>
				<label for="account-provider">{steps.provider.name}</label>
				<select id="account-provider" bind:value={draft.provider} required>
					<option value="">Choose</option>
					{#each choicesOf(steps.provider) as choice (choice)}
						<option value={choice}>{choice}</option>
					{/each}
				</select>
			</p>
			<p><Button type="submit" variant="primary">Next</Button></p>
		{:else}
			<p>{steps.provider.name}: {draft.provider}</p>
			<fieldset>
				<legend>{steps.identities.name}</legend>
				{#each kinds as kind (kind)}
					<p>
						<label for="identity-{kind}">{kindLabel(kind)}</label>
						<MaskedInput
							id="identity-{kind}"
							name="identities.{kind}"
							bind:value={draft.values[kind]}
							label={kindLabel(kind)}
						/>
					</p>
				{/each}
				<p>Fill in at least one.</p>
			</fieldset>
			<p>
				<Button onclick={back}>Back</Button>
				<Button type="submit" variant="primary" disabled={busy || written?.ok === true}>
					Create {description.name}
				</Button>
			</p>
		{/if}
		{#if problems.length > 0}
			<p role="alert">{problems.join(' ')}</p>
		{:else}
			<Written {written} onsettled={settled} />
		{/if}
	</form>
{/if}
