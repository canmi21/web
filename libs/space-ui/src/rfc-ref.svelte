<script lang="ts">
	/**
	 * An RFC cited by its id, as a rule cites the reasons behind it: a link where the RFCs are read,
	 * which is development alone until they are published, and the id as words everywhere else.
	 * Only the id names it, so the link asks the RFCs for the id and they send the reader on. `RFC`
	 * is in the mono and the id in the sans. See spec/architecture/space.md.
	 */
	import * as stylex from '@stylexjs/stylex';
	import { fontSize, fontWeight } from '@canmi/design/scale.stylex';

	let { id, dev }: { id: string; dev: boolean } = $props();

	const styles = stylex.create({
		ref: {
			fontSize: fontSize.body,
			fontWeight: fontWeight.medium,
			color: 'var(--foreground-muted)',
			whiteSpace: 'nowrap',
		},
		kind: { fontFamily: 'var(--font-mono)' },
		/** A link by its place and the pointer alone, with no underline. */
		link: {
			color: { default: 'var(--foreground-muted)', ':hover': 'var(--foreground-strong)' },
			textDecorationLine: 'none',
			cursor: 'pointer',
		},
	});
</script>

{#snippet cited()}
	<span><span class={stylex.attrs(styles.kind).class}>RFC</span> {id}</span>
{/snippet}

{#if dev}
	<a href="/rfcs/{id}" class={stylex.attrs(styles.ref, styles.link).class}>{@render cited()}</a>
{:else}
	<span class={stylex.attrs(styles.ref).class}>{@render cited()}</span>
{/if}
