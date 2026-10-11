<script lang="ts">
	/**
	 * One RFC as a document on the page's ground: its area above, its decision as the title, its
	 * facts in a table under it, the body as prose, and where what it took came from at its foot; a
	 * rail beside it names the sections, where the page is wide enough to hold one. See RFC 2ut6h.
	 */
	import * as stylex from '@stylexjs/stylex';
	import { resolve } from '$app/paths';
	import { borderWidth, fontSize, fontWeight, lineHeight } from '@canmi/design/scale.stylex';
	import Prose from '@canmi/space-ui/prose.svelte';
	import { dayOf } from '#lib/day.ts';
	import { titleOf } from '#lib/pages.ts';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const rail = $derived([...data.sections, { anchor: 'references', title: 'References' }]);

	const styles = stylex.create({
		page: {
			display: 'grid',
			gridTemplateColumns: {
				default: 'minmax(0, 1fr)',
				'@media (width >= 80rem)': 'minmax(0, 44rem) 12rem',
			},
			justifyContent: 'center',
			columnGap: '4rem',
			paddingBlock: '1rem 4rem',
		},
		article: { display: 'flex', minWidth: 0, flexDirection: 'column', gap: '2rem' },
		head: { display: 'flex', flexDirection: 'column', gap: '1rem' },
		eyebrow: {
			display: 'flex',
			gap: '0.5rem',
			fontSize: fontSize.label,
			fontWeight: fontWeight.medium,
			color: 'var(--foreground-subtle)',
		},
		area: { color: { default: 'var(--foreground-muted)', ':hover': 'var(--foreground-strong)' } },
		title: {
			fontSize: '2rem', // unnamed: a document's title, the largest words it has
			fontWeight: fontWeight.semibold,
			letterSpacing: '-0.025em',
			lineHeight: 1.2,
			color: 'var(--foreground-strong)',
			textWrap: 'balance',
		},
		/** The RFC's facts, a term and its value a row, ruled above and below. */
		facts: {
			display: 'grid',
			gridTemplateColumns: '7rem minmax(0, 1fr)',
			rowGap: '0.5rem',
			paddingBlock: '1rem',
			borderBlockWidth: borderWidth.hairline,
			borderBlockStyle: 'solid',
			borderBlockColor: 'var(--border-default)',
			fontSize: fontSize.body,
		},
		term: { color: 'var(--foreground-subtle)' },
		value: { color: 'var(--foreground-default)' },
		mono: { fontFamily: 'var(--font-mono)', fontSize: fontSize.label },
		inEffect: { color: 'var(--status-success)' },
		draft: { color: 'var(--status-info)' },
		superseded: { color: 'var(--status-warning)' },
		link: {
			color: 'var(--foreground-strong)',
			textDecorationLine: 'underline',
			textDecorationColor: 'var(--border-strong)',
			textUnderlineOffset: '0.2em',
		},
		references: { display: 'flex', flexDirection: 'column', gap: '1rem' },
		h2: {
			fontSize: '1.25rem', // unnamed: a section's title, as the prose's own
			fontWeight: fontWeight.semibold,
			letterSpacing: '-0.01em',
			color: 'var(--foreground-strong)',
			scrollMarginTop: '1.5rem',
		},
		sources: {
			display: 'flex',
			flexDirection: 'column',
			gap: '0.75rem',
			paddingLeft: '1.25rem',
			listStyleType: 'decimal',
			fontSize: fontSize.body,
			lineHeight: lineHeight.relaxed,
			'::marker': { color: 'var(--foreground-subtle)' },
		},
		took: { display: 'block', color: 'var(--foreground-muted)' },
		none: { fontSize: fontSize.body, color: 'var(--foreground-muted)' },
		rail: {
			display: { default: 'none', '@media (width >= 80rem)': 'flex' },
			position: 'sticky',
			top: '1rem',
			alignSelf: 'start',
			flexDirection: 'column',
			gap: '0.5rem',
			fontSize: fontSize.label,
		},
		railTitle: { fontWeight: fontWeight.medium, color: 'var(--foreground-default)' },
		railLink: {
			color: { default: 'var(--foreground-subtle)', ':hover': 'var(--foreground-strong)' },
		},
	});
</script>

<svelte:head>
	<title>{data.front.title} · RFCs</title>
</svelte:head>

<div class={stylex.attrs(styles.page).class}>
	<article class={stylex.attrs(styles.article).class}>
		<header class={stylex.attrs(styles.head).class}>
			<p class={stylex.attrs(styles.eyebrow).class}>
				<a href={resolve('/[scope]', { scope: data.scope })} class={stylex.attrs(styles.area).class}
					>{titleOf(data.scope)}</a
				>
				<span aria-hidden="true">/</span>
				<span>RFC {data.id}</span>
			</p>
			<h1 class={stylex.attrs(styles.title).class}>{data.front.title}</h1>
			<dl class={stylex.attrs(styles.facts).class}>
				<dt class={stylex.attrs(styles.term).class}>Status</dt>
				<dd class={stylex.attrs(styles.value).class}>
					{#if data.front.status === 'draft'}
						<span class={stylex.attrs(styles.draft).class}>Draft</span>, not yet decided
					{:else if data.front.status === 'accepted'}
						<span class={stylex.attrs(styles.draft).class}>Accepted</span>, not yet landed
					{:else if data.front.status === 'declined'}
						<span class={stylex.attrs(styles.superseded).class}>Declined</span>
					{:else if data.supersededBy}
						<span class={stylex.attrs(styles.superseded).class}>Superseded</span> by
						<a
							href={data.paths[data.supersededBy]}
							class={stylex.attrs(styles.link, styles.mono).class}>{data.supersededBy}</a
						>
					{:else}
						<span class={stylex.attrs(styles.inEffect).class}>In effect</span>
					{/if}
				</dd>
				<dt class={stylex.attrs(styles.term).class}>Filed</dt>
				<dd class={stylex.attrs(styles.value).class}>
					<time datetime={dayOf(data.day)}>{dayOf(data.day)}</time>
				</dd>
				{#if data.front['blocked-by'].length > 0}
					<dt class={stylex.attrs(styles.term).class}>Blocked by</dt>
					<dd class={stylex.attrs(styles.value).class}>
						{#each data.front['blocked-by'] as id, index (id)}{index > 0 ? ', ' : ''}<a
								href={data.paths[id]}
								class={stylex.attrs(styles.link, styles.mono).class}>{id}</a
							>{/each}
					</dd>
				{/if}
				{#if data.front.supersedes.length > 0}
					<dt class={stylex.attrs(styles.term).class}>Supersedes</dt>
					<dd class={stylex.attrs(styles.value).class}>
						{#each data.front.supersedes as id, index (id)}{index > 0 ? ', ' : ''}<a
								href={data.paths[id]}
								class={stylex.attrs(styles.link, styles.mono).class}>{id}</a
							>{/each}
					</dd>
				{/if}
				{#if data.front.commits.length > 0}
					<dt class={stylex.attrs(styles.term).class}>Landed in</dt>
					<dd class={stylex.attrs(styles.value, styles.mono).class}>
						{data.front.commits.join(', ')}
					</dd>
				{/if}
			</dl>
		</header>

		<Prose tree={data.tree} />

		<section class={stylex.attrs(styles.references).class}>
			<h2 id="references" class={stylex.attrs(styles.h2).class}>References</h2>
			{#if data.front.references.length === 0}
				<p class={stylex.attrs(styles.none).class}>None: the idea is our own.</p>
			{:else}
				<ol class={stylex.attrs(styles.sources).class}>
					{#each data.front.references as reference (reference.url)}
						<li>
							<a href={reference.url} class={stylex.attrs(styles.link).class}>{reference.url}</a>
							<span class={stylex.attrs(styles.took).class}>
								{reference.took}{#if reference.via}; found via
									<a href={reference.via} class={stylex.attrs(styles.link).class}>{reference.via}</a
									>{/if}
							</span>
						</li>
					{/each}
				</ol>
			{/if}
		</section>
	</article>

	<nav aria-label="On this page" class={stylex.attrs(styles.rail).class}>
		<p class={stylex.attrs(styles.railTitle).class}>On this page</p>
		{#each rail as section (section.anchor)}
			<a href="#{section.anchor}" class={stylex.attrs(styles.railLink).class}>{section.title}</a>
		{/each}
	</nav>
</div>
