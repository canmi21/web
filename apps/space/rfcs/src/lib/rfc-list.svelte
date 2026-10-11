<script lang="ts">
	/**
	 * RFCs on a card, under a title and a sentence: each its decision as a link, then its area,
	 * its day and its id; a draft, a declined one, and one replaced by a later RFC say so.
	 */
	import * as stylex from '@stylexjs/stylex';
	import { resolve } from '$app/paths';
	import {
		borderWidth,
		fontSize,
		fontWeight,
		lineHeight,
		radius,
	} from '@canmi/design/scale.stylex';
	import { rfcPath } from '#lib/rfc/name.ts';
	import type { Summary } from '#lib/rfc/store.ts';
	import { dayOf } from '#lib/day.ts';

	let { title, sentence, rfcs }: { title: string; sentence: string; rfcs: readonly Summary[] } =
		$props();

	const styles = stylex.create({
		card: {
			display: 'flex',
			flexDirection: 'column',
			borderWidth: borderWidth.hairline,
			borderStyle: 'solid',
			borderColor: 'var(--border-default)',
			borderRadius: radius.xl,
			backgroundColor: 'var(--background-surface)',
		},
		head: { display: 'flex', flexDirection: 'column', gap: '0.25rem', padding: '1rem 1.25rem' },
		title: {
			fontSize: '1.5rem', // unnamed: a page title
			fontWeight: fontWeight.semibold,
			letterSpacing: '-0.02em',
			color: 'var(--foreground-strong)',
		},
		sentence: {
			fontSize: '1rem', // unnamed: the reader's own size, for a sentence to read
			lineHeight: lineHeight.relaxed,
			color: 'var(--foreground-muted)',
		},
		row: {
			display: 'flex',
			flexDirection: 'column',
			gap: '0.25rem',
			paddingBlock: '0.875rem',
			paddingInline: '1.25rem',
			borderTopWidth: borderWidth.hairline,
			borderTopStyle: 'solid',
			borderTopColor: 'var(--border-subtle)',
			backgroundColor: { default: 'transparent', ':hover': 'var(--interaction-subtle)' },
		},
		decision: {
			fontSize: '1rem',
			fontWeight: fontWeight.medium,
			color: 'var(--foreground-strong)',
		},
		meta: {
			display: 'flex',
			flexWrap: 'wrap',
			gap: '0.75rem',
			fontSize: fontSize.label,
			color: 'var(--foreground-subtle)',
		},
		id: { fontFamily: 'var(--font-mono)' },
		status: { color: 'var(--status-info)' },
		superseded: { color: 'var(--status-warning)' },
		empty: { padding: '1rem 1.25rem', color: 'var(--foreground-muted)' },
	});
</script>

<section class={stylex.attrs(styles.card).class}>
	<header class={stylex.attrs(styles.head).class}>
		<h1 class={stylex.attrs(styles.title).class}>{title}</h1>
		<p class={stylex.attrs(styles.sentence).class}>{sentence}</p>
	</header>
	{#each rfcs as rfc (rfc.id)}
		<a href={rfcPath(rfc.scope, rfc)} class={stylex.attrs(styles.row).class}>
			<span class={stylex.attrs(styles.decision).class}>{rfc.title}</span>
			<span class={stylex.attrs(styles.meta).class}>
				<span>{rfc.scope}</span>
				<time datetime={dayOf(rfc.day)}>{dayOf(rfc.day)}</time>
				<span class={stylex.attrs(styles.id).class}>{rfc.id}</span>
				{#if rfc.status}
					<span class={stylex.attrs(styles.status).class}>{rfc.status}</span>
				{/if}
				{#if rfc.supersededBy}
					<span class={stylex.attrs(styles.superseded).class}>superseded by {rfc.supersededBy}</span
					>
				{/if}
			</span>
		</a>
	{:else}
		<p class={stylex.attrs(styles.empty).class}>None yet.</p>
	{/each}
</section>
