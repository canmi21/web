<script lang="ts">
	/**
	 * What a write came back with, said under what made it: control's refusal with its code,
	 * nothing to change, or the revision it made, `onsettled` once it is written. Control writes
	 * before it answers, so there is no task to follow -- platform's spec/architecture/control.md.
	 */
	import type { Written } from '../control/types.ts';

	let { written, onsettled }: { written: Written | undefined; onsettled?: () => void } = $props();

	$effect(() => {
		if (written?.ok && 'revision' in written) onsettled?.();
	});
</script>

{#if written && !written.ok}
	<p role="alert">{written.failure.message} ({written.failure.code})</p>
{:else if written && 'unchanged' in written}
	<p role="status">Nothing to change.</p>
{:else if written && 'revision' in written}
	<p role="status">Written at revision {written.revision}.</p>
{/if}
