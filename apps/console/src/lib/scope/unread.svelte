<script lang="ts">
	/**
	 * Said while control has never answered and nothing of it is kept: every app is shown by its
	 * code name and under Services, every node by its short id, and nodes are tried in continent
	 * order. See RFC 17b3o.
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
		>Control has not answered yet: apps are shown by their code names, every one under Services, and
		nodes by their ids.</span
	>
</p>
