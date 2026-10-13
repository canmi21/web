<script lang="ts">
	/**
	 * A specimen's card: its name and one sentence of the rule it shows, the RFC behind the rule at
	 * the head's top right, always there, and the specimen under them, in a body that is a container
	 * so what it holds can read its width. See spec/architecture/space.md, "Specimens are laid on
	 * paper".
	 */
	import * as stylex from '@stylexjs/stylex';
	import type { Snippet } from 'svelte';
	import {
		borderWidth,
		fontSize,
		fontWeight,
		lineHeight,
		radius,
	} from '@canmi/design/scale.stylex';
	import { frame } from './frame.stylex.ts';
	import RfcRef from '@canmi/space-ui/rfc-ref.svelte';
	import { ring } from '@canmi/space-ui/ring';
	import { dev } from '$app/env';

	let {
		title,
		rule,
		rfc,
		href,
		children,
	}: {
		title: string;
		rule: string;
		/** The RFC behind the rule; none on a card that stands for a part of the system, as home's. */
		rfc?: string;
		/**
		 * Where the card leads, as home's do: its title is the link, stretched over the whole card,
		 * so a press anywhere on it but on what is `above` enters, and the keyboard rings the card.
		 */
		href?: string;
		children: Snippet;
	} = $props();

	const styles = stylex.create({
		/** A card that leads somewhere: its title's link reaches over all of it. */
		leads: { position: 'relative', cursor: 'pointer' },
		stretched: {
			color: 'inherit',
			'::after': {
				content: '""',
				position: 'absolute',
				inset: `calc(-1 * ${borderWidth.hairline})`,
				zIndex: 1,
				borderRadius: radius.xl,
				outlineWidth: 'var(--ring, 0)',
				outlineStyle: 'solid',
				outlineColor: 'var(--interaction-focus)',
			},
		},
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

<section class={stylex.attrs(styles.card, href !== undefined && styles.leads).class}>
	<header class={stylex.attrs(styles.head).class}>
		<div class={stylex.attrs(styles.words).class}>
			<h2 class={stylex.attrs(styles.title).class}>
				{#if href}
					<a {href} class={stylex.attrs(styles.stretched, ring.host).class}>{title}</a>
				{:else}
					{title}
				{/if}
			</h2>
			<p class={stylex.attrs(styles.rule).class}>{rule}</p>
		</div>
		{#if rfc}
			<span class={stylex.attrs(styles.cited).class}><RfcRef id={rfc} {dev} /></span>
		{/if}
	</header>
	<div class={stylex.attrs(styles.body).class}>
		{@render children()}
	</div>
</section>
