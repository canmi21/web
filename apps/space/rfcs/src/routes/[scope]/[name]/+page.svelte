<script lang="ts">
	/**
	 * One RFC on a card: its decision as the title, its area, day and id, the body as prose, and
	 * beneath it where what it took came from and the commits it landed in. See RFC 2ut6h.
	 */
	import * as stylex from '@stylexjs/stylex';
	import { resolve } from '$app/paths';
	import { borderWidth, fontSize, fontWeight, radius } from '@canmi/design/scale.stylex';
	import Prose from '@canmi/space-ui/prose.svelte';
	import { dayOf } from '#lib/day.ts';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const styles = stylex.create({
		card: {
			display: 'flex',
			flexDirection: 'column',
			gap: '1.5rem',
			maxWidth: '48rem',
			padding: '1.5rem 1.75rem 1.75rem',
			borderWidth: borderWidth.hairline,
			borderStyle: 'solid',
			borderColor: 'var(--border-default)',
			borderRadius: radius.xl,
			backgroundColor: 'var(--background-surface)',
		},
		head: { display: 'flex', flexDirection: 'column', gap: '0.75rem' },
		meta: {
			display: 'flex',
			flexWrap: 'wrap',
			gap: '0.75rem',
			fontSize: fontSize.label,
			color: 'var(--foreground-subtle)',
		},
		id: { fontFamily: 'var(--font-mono)' },
		link: { color: { default: 'var(--foreground-muted)', ':hover': 'var(--foreground-strong)' } },
		title: {
			fontSize: '1.5rem', // unnamed: a page title
			fontWeight: fontWeight.semibold,
			letterSpacing: '-0.02em',
			lineHeight: 1.3,
			color: 'var(--foreground-strong)',
		},
		notice: {
			padding: '0.625rem 0.875rem',
			borderRadius: radius.md,
			backgroundColor: 'var(--interaction-subtle)',
			fontSize: fontSize.body,
			color: 'var(--foreground-default)',
		},
		foot: {
			display: 'flex',
			flexDirection: 'column',
			gap: '0.5rem',
			paddingTop: '1.25rem',
			borderTopWidth: borderWidth.hairline,
			borderTopStyle: 'solid',
			borderTopColor: 'var(--border-default)',
			fontSize: fontSize.body,
		},
		footTitle: {
			fontSize: fontSize.label,
			fontWeight: fontWeight.medium,
			color: 'var(--foreground-muted)',
		},
		list: { display: 'flex', flexDirection: 'column', gap: '0.375rem' },
		source: {
			color: 'var(--foreground-strong)',
			textDecorationLine: 'underline',
			textDecorationColor: 'var(--border-strong)',
			textUnderlineOffset: '0.2em',
			overflowWrap: 'anywhere',
		},
		took: { color: 'var(--foreground-muted)' },
		none: { color: 'var(--foreground-muted)' },
	});
</script>

<svelte:head>
	<title>{data.front.title} · RFCs</title>
</svelte:head>

<article class={stylex.attrs(styles.card).class}>
	<header class={stylex.attrs(styles.head).class}>
		<p class={stylex.attrs(styles.meta).class}>
			<a href={resolve('/[scope]', { scope: data.scope })} class={stylex.attrs(styles.link).class}
				>{data.scope}</a
			>
			<time datetime={dayOf(data.day)}>{dayOf(data.day)}</time>
			<span class={stylex.attrs(styles.id).class}>{data.id}</span>
		</p>
		<h1 class={stylex.attrs(styles.title).class}>{data.front.title}</h1>
		{#if data.supersededBy}
			<p class={stylex.attrs(styles.notice).class}>
				Superseded by <a
					href={data.paths[data.supersededBy]}
					class={stylex.attrs(styles.source).class}>{data.supersededBy}</a
				>.
			</p>
		{/if}
		{#if data.front.supersedes.length > 0}
			<p class={stylex.attrs(styles.notice).class}>
				Supersedes
				{#each data.front.supersedes as id, index (id)}{index > 0 ? ', ' : ''}<a
						href={data.paths[id]}
						class={stylex.attrs(styles.source).class}>{id}</a
					>{/each}.
			</p>
		{/if}
	</header>

	<Prose tree={data.tree} />

	<footer class={stylex.attrs(styles.foot).class}>
		<h2 class={stylex.attrs(styles.footTitle).class}>References</h2>
		{#if data.front.references.length === 0}
			<p class={stylex.attrs(styles.none).class}>None: the idea is our own.</p>
		{:else}
			<ul class={stylex.attrs(styles.list).class}>
				{#each data.front.references as reference (reference.url)}
					<li>
						<a href={reference.url} class={stylex.attrs(styles.source).class}>{reference.url}</a>
						<span class={stylex.attrs(styles.took).class}>-- {reference.took}</span>
						{#if reference.via}
							<span class={stylex.attrs(styles.took).class}
								>(found via <a href={reference.via} class={stylex.attrs(styles.source).class}
									>{reference.via}</a
								>)</span
							>
						{/if}
					</li>
				{/each}
			</ul>
		{/if}
		{#if data.front.commits.length > 0}
			<h2 class={stylex.attrs(styles.footTitle).class}>Landed in</h2>
			<p class={stylex.attrs(styles.id).class}>{data.front.commits.join(', ')}</p>
		{/if}
	</footer>
</article>
