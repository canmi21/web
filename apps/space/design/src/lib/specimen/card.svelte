<script lang="ts">
	/**
	 * A specimen's card: its name and one sentence of the rule it shows, the RFC behind the rule
	 * after it, and the specimen under them, in a body that is a container so what it holds can read
	 * its width. See spec/architecture/space.md, "Specimens are laid on paper".
	 */
	import * as stylex from '@stylexjs/stylex';
	import type { Snippet } from 'svelte';
	import { borderWidth, fontWeight, lineHeight, radius } from '@canmi/design/scale.stylex';
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
			flexDirection: 'column',
			gap: '0.25rem',
			paddingInline: '1.25rem',
			paddingTop: '1rem',
		},
		title: {
			fontSize: '1.5rem', // unnamed: a page title
			fontWeight: fontWeight.semibold,
			letterSpacing: '-0.02em',
			color: 'var(--foreground-strong)',
		},
		rule: {
			fontSize: '1rem', // unnamed: the reader's own size, for a sentence to read
			lineHeight: lineHeight.relaxed,
			color: 'var(--foreground-muted)',
		},
		body: {
			containerType: 'inline-size',
			display: 'flex',
			flexGrow: 1,
			flexDirection: 'column',
			paddingInline: '1.25rem',
			paddingTop: '0.75rem',
			paddingBottom: '1.25rem',
		},
	});
</script>

<section class={stylex.attrs(styles.card).class}>
	<header class={stylex.attrs(styles.head).class}>
		<h2 class={stylex.attrs(styles.title).class}>{title}</h2>
		<p class={stylex.attrs(styles.rule).class}>{rule} <RfcRef id={rfc} {dev} /></p>
	</header>
	<div class={stylex.attrs(styles.body).class}>
		{@render children()}
	</div>
</section>
