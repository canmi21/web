<script lang="ts">
	/** An app's state on a node, as a badge. */
	import Badge from '../ui/badge.svelte';
	import type { State } from './apps.ts';

	let { state }: { state: State } = $props();

	const TONES = { running: 'good', held: 'warn', stopped: 'bad', driver: 'quiet' } as const;
	const WORDS = { running: 'Running', held: 'Held', stopped: 'Stopped', driver: 'Driver' } as const;
</script>

<Badge tone={TONES[state]}>{WORDS[state]}</Badge>
