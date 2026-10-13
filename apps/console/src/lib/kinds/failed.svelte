<script lang="ts">
	/** A read or a write of the control plane that did not answer, said where its data would be. */
	import type { Failure } from '../control/types.ts';

	let { what, failure }: { what: string; failure: Failure } = $props();
</script>

<p role="alert">{what} could not be read: {failure.message} ({failure.code})</p>
