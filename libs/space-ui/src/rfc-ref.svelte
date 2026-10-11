<script lang="ts">
	/**
	 * An RFC cited by its id, as a rule cites the reasons behind it: a link where the RFCs are read,
	 * which is development alone until they are published, and the id as words everywhere else.
	 * Only the id names it, so the link asks the RFCs for the id and they send the reader on. See
	 * spec/architecture/space.md.
	 */
	import * as stylex from '@stylexjs/stylex';

	let { id, dev }: { id: string; dev: boolean } = $props();

	const styles = stylex.create({
		ref: { fontFamily: 'var(--font-mono)', fontSize: '0.875em', color: 'var(--foreground-muted)' },
		link: {
			color: { default: 'var(--foreground-muted)', ':hover': 'var(--foreground-strong)' },
			textDecorationLine: 'underline',
			textDecorationColor: 'var(--border-strong)',
			textUnderlineOffset: '0.2em',
		},
	});
</script>

{#if dev}
	<a href="/rfcs/{id}" class={stylex.attrs(styles.ref, styles.link).class}>RFC {id}</a>
{:else}
	<span class={stylex.attrs(styles.ref).class}>RFC {id}</span>
{/if}
