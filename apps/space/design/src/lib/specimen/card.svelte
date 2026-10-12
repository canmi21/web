<script lang="ts">
	/**
	 * A specimen's card: its name and one sentence of the rule it shows, the RFC behind the rule at
	 * the head's top right, always there, and the specimen under them, in a body that is a container
	 * so what it holds can read its width. See spec/architecture/space.md, "Specimens are laid on
	 * paper".
	 */
	import * as stylex from '@stylexjs/stylex';
	import type { Snippet } from 'svelte';
	import { borderWidth, fontSize, fontWeight, lineHeight, radius } from '@canmi/design/scale.stylex';
	import { frame } from './frame.stylex.ts';
	import RfcRef from '@canmi/space-ui/rfc-ref.svelte';
	import { dev } from '$app/env';

	let {
		title,
		rule,
		rfc,
		children,
	}: { title: string; rule: string; rfc: string; children: Snippet } = $props();

	const styles = stylex.create({
		card: {
			display: 'flex',
			minWidth: 0,
			flexDirection: 'column',
			borderWidth: borderWidth.hairline,
			borderStyle: 'solid',
			borderColor: 'var(--border-default)',
			borderRadius: radius.xl,
			backgroundColor: 'var(--background-surface)',
			boxShadow: 'var(--shadow-surface)',
		},
		head: {
			display: 'flex',
			alignItems: 'flex-start',
			justifyContent: 'space-between',
			gap: '1.5rem',
			paddingInline: frame.inset,
			paddingTop: frame.inset,
		},
		words: { display: 'flex', flexDirection: 'column', gap: '0.5rem' },
		/** The RFC, its capitals' top level with the title's. */
		cited: { flexShrink: 0, textBox: 'trim-start cap alphabetic' },
		title: {
			fontSize: fontSize.headline,
			fontWeight: fontWeight.semibold,
			letterSpacing: '-0.02em',
			color: 'var(--foreground-strong)',
			// The leading above the capitals trimmed, so the card's top inset is its sides'.
			textBox: 'trim-start cap alphabetic',
		},
		rule: {
			fontSize: fontSize.prose,
			lineHeight: lineHeight.relaxed,
			color: 'var(--foreground-muted)',
			// And below the baseline, so the gap to the specimen is the inset again.
			textBox: 'trim-end cap alphabetic',
		},
		body: {
			containerType: 'inline-size',
			display: 'flex',
			flexGrow: 1,
			flexDirection: 'column',
			padding: frame.inset,
		},
	});
</script>

<section class={stylex.attrs(styles.card).class}>
	<header class={stylex.attrs(styles.head).class}>
		<div class={stylex.attrs(styles.words).class}>
			<h2 class={stylex.attrs(styles.title).class}>{title}</h2>
			<p class={stylex.attrs(styles.rule).class}>{rule}</p>
		</div>
		<span class={stylex.attrs(styles.cited).class}><RfcRef id={rfc} {dev} /></span>
	</header>
	<div class={stylex.attrs(styles.body).class}>
		{@render children()}
	</div>
</section>
