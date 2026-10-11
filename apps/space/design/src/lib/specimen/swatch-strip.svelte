<script lang="ts">
	/**
	 * A group of the contract's colors as one strip, each laid on the ground as a component would
	 * lay it, side by side so a group reads as one: a fill for what is laid as a ground, `Aa` for
	 * what is laid as ink. Under it one line names the one under the pointer or the keyboard, with
	 * its value as the page is painted; a press copies its name, which is what a component reads.
	 */
	import * as stylex from '@stylexjs/stylex';
	import Stage from './stage.svelte';
	import { borderWidth, duration, fontSize, fontWeight, radius } from '@canmi/design/scale.stylex';

	let {
		names,
		values,
		ink = false,
	}: {
		names: readonly string[];
		/** Each name's value as painted, read off the document by the page. */
		values: Readonly<Record<string, string>>;
		/** Drawn as text in the color rather than filled with it. */
		ink?: boolean;
	} = $props();

	/** The one named under the strip, and whether its name was just copied. */
	let shown = $state<string | undefined>();
	let copied = $state<string | undefined>();
	let settle: ReturnType<typeof setTimeout> | undefined;

	async function copy(name: string) {
		// A browser that refuses the clipboard, unfocused or unasked, leaves the name shown as it was.
		const done = await navigator.clipboard.writeText(name).then(
			() => true,
			() => false,
		);
		if (!done) return;
		copied = name;
		clearTimeout(settle);
		settle = setTimeout(() => (copied = undefined), 1200);
	}

	const styles = stylex.create({
		/** Inside the stage's frame, its corners a step inside the stage's own. */
		strip: {
			display: 'flex',
			overflow: 'hidden',
			borderRadius: radius.lg,
		},
		swatch: {
			display: 'flex',
			width: '7rem',
			height: '4rem',
			alignItems: 'center',
			justifyContent: 'center',
			padding: 0,
			borderWidth: 0,
			borderStyle: 'solid',
			borderColor: 'var(--border-default)',
			backgroundColor: 'transparent',
			cursor: 'copy',
		},
		/** A rule between two, so neighbors of one value still read as two. */
		after: { borderLeftWidth: borderWidth.hairline },
		ink: { fontSize: '1.5rem', fontWeight: fontWeight.medium },
		caption: {
			display: 'flex',
			minHeight: '1.25rem',
			gap: '0.75rem',
			fontSize: fontSize.caption,
			transitionProperty: 'opacity',
			transitionDuration: duration.base,
		},
		name: { color: 'var(--foreground-strong)', fontFamily: 'var(--font-mono)' },
		value: { color: 'var(--foreground-muted)', fontFamily: 'var(--font-mono)' },
	});
</script>

<div class="flex flex-col gap-2">
	<Stage>
		<div class={stylex.attrs(styles.strip).class} role="group">
			{#each names as name, index (name)}
				<button
					type="button"
					aria-label="Copy {name}"
					class={stylex.attrs(styles.swatch, index > 0 && styles.after).class}
					style:background-color={ink ? undefined : `var(${name})`}
					onpointerenter={() => (shown = name)}
					onpointerleave={() => (shown = undefined)}
					onfocus={() => (shown = name)}
					onblur={() => (shown = undefined)}
					onclick={() => copy(name)}
				>
					{#if ink}
						<span class={stylex.attrs(styles.ink).class} style:color="var({name})">Aa</span>
					{/if}
				</button>
			{/each}
		</div>
	</Stage>
	<p class={stylex.attrs(styles.caption).class} aria-live="polite">
		{#if shown}
			<span class={stylex.attrs(styles.name).class}>{shown}</span>
			<span class={stylex.attrs(styles.value).class}
				>{copied === shown ? 'Copied' : (values[shown] ?? '')}</span
			>
		{/if}
	</p>
</div>
