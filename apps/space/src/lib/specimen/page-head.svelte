<script lang="ts">
	/**
	 * A page's own head: its name and one sentence of what it shows, and nothing else, so the
	 * specimens start right under it. See spec/architecture/space.md, "Specimens are laid
	 * on paper".
	 */
	import * as stylex from '@stylexjs/stylex';
	import { fontSize, fontWeight, lineHeight } from '@canmi/design/scale.stylex';

	let { title, lede }: { title: string; lede: string } = $props();

	const styles = stylex.create({
		head: { display: 'flex', flexDirection: 'column', gap: '0.5rem', maxWidth: '40rem' },
		title: {
			fontSize: '1.5rem', // unnamed: a page's one large thing, as the console's title is
			fontWeight: fontWeight.semibold,
			letterSpacing: '-0.02em',
			color: 'var(--foreground-strong)',
		},
		lede: {
			fontSize: fontSize.body,
			lineHeight: lineHeight.relaxed,
			color: 'var(--foreground-muted)',
		},
	});
</script>

<svelte:head>
	<title>{title}</title>
</svelte:head>

<header class={stylex.attrs(styles.head).class}>
	<h1 class={stylex.attrs(styles.title).class}>{title}</h1>
	<p class={stylex.attrs(styles.lede).class}>{lede}</p>
</header>
