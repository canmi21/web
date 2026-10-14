<script lang="ts">
	/**
	 * Said while the registry has never answered and nothing of it is kept: every app is shown by
	 * its code name and under Services, and nodes are tried in continent order. See RFC 17b3o.
	 */
	import * as stylex from '@stylexjs/stylex';
	import WarningIcon from '@tabler/icons-svelte-runes/icons/alert-triangle';
	import { tone, type } from '../style.ts';
</script>

<p class="flex items-center gap-2 px-4 py-2 {stylex.attrs(type.soft).class}" role="status">
	<span class="inline-flex shrink-0 {stylex.attrs(tone.warn).class}"
		><WarningIcon size={16} stroke={2.5} /></span
	>
	<span
		>The registry has not answered yet: apps and nodes are shown by their code names, every app
		under Services.</span
	>
</p>
