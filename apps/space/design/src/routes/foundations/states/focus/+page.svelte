<script lang="ts">
	/**
	 * The keyboard's ring: every kind of thing it lands on at once, then a control flush on its own
	 * shape, words a fixed room off their ink at every size, and the same things live, ringed only
	 * when the keyboard reaches them -- RFC mpy16, and the ring's blue RFC qb7r9.
	 */
	import * as stylex from '@stylexjs/stylex';
	import { borderWidth, fontSize, fontWeight, radius } from '@canmi/design/scale.stylex';
	import Icon from '@canmi/design/components/icon.svelte';
	import Tooltip from '@canmi/design/components/tooltip.svelte';
	import SearchIcon from '@tabler/icons-svelte-runes/icons/search';
	import Box from '#lib/specimen/box.svelte';
	import Card from '#lib/specimen/card.svelte';
	import { descends, ring } from '@canmi/space-ui/ring';

	/** A thing the ring lands on: a control of some shape, or words at a size. */
	type Mark =
		| { kind: 'button' | 'primary' | 'pill' | 'field' | 'icon'; name: string; text?: string }
		| { kind: 'words'; name: string; size: keyof typeof fontSize; text: string };

	const CONTROLS: readonly Mark[] = [
		{ kind: 'button', name: 'Button', text: 'Secondary' },
		{ kind: 'primary', name: 'Button', text: 'Primary' },
		{ kind: 'pill', name: 'Pill', text: 'Tag' },
		{ kind: 'field', name: 'Field', text: 'Search' },
		{ kind: 'icon', name: 'Icon button' },
	];
	/** One word at each size, with no letter below its baseline, so every ring ends on one line. */
	const WORDS: readonly Mark[] = [
		{ kind: 'words', name: 'Caption', size: 'caption', text: 'Focus' },
		{ kind: 'words', name: 'Body', size: 'body', text: 'Focus' },
		{ kind: 'words', name: 'Title', size: 'title', text: 'Focus' },
		{ kind: 'words', name: 'Display', size: 'display', text: 'Focus' },
	];

	/** The first card's row and the row the cards after it are measured against, in rem. */
	const ALL_ROW = 29.5;
	const ROW = 29.5;

	const styles = stylex.create({
		row: {
			display: 'flex',
			flexWrap: 'wrap',
			alignItems: 'center',
			justifyContent: 'center',
			gap: '1.25rem',
		},
		/** Words on one baseline, far enough apart that no two rings meet. */
		words: { alignItems: 'baseline', columnGap: '2rem' },
		rows: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2.5rem' },
		/** A thing pressed or reached, drawn only as its kind says. */
		reset: {
			padding: 0,
			borderWidth: 0,
			backgroundColor: 'transparent',
			color: 'var(--foreground-strong)',
			cursor: 'default',
		},
		button: {
			display: 'flex',
			alignItems: 'center',
			height: '2rem',
			paddingInline: '0.75rem',
			borderWidth: borderWidth.hairline,
			borderStyle: 'solid',
			borderColor: 'var(--border-default)',
			borderRadius: radius.md,
			fontSize: fontSize.label,
			fontWeight: fontWeight.medium,
		},
		primary: {
			borderColor: 'transparent',
			color: 'var(--background-base)',
			backgroundColor: 'var(--foreground-strong)',
		},
		pill: {
			paddingBlock: '0.125rem',
			paddingInline: '0.5rem',
			borderRadius: radius.full,
			fontSize: fontSize.caption,
			fontWeight: fontWeight.medium,
			color: 'var(--foreground-default)',
			backgroundColor: 'var(--interaction-muted)',
		},
		field: {
			display: 'flex',
			alignItems: 'center',
			gap: '0.5rem',
			width: '10rem',
			height: '2rem',
			paddingInline: '0.625rem',
			borderWidth: borderWidth.hairline,
			borderStyle: 'solid',
			borderColor: 'var(--border-default)',
			borderRadius: radius.md,
			backgroundColor: 'var(--background-base)',
			fontSize: fontSize.label,
			color: 'var(--foreground-subtle)',
		},
		icon: {
			display: 'flex',
			alignItems: 'center',
			justifyContent: 'center',
			width: '2rem',
			height: '2rem',
			borderWidth: borderWidth.hairline,
			borderStyle: 'solid',
			borderColor: 'var(--border-default)',
			borderRadius: radius.md,
			color: 'var(--foreground-default)',
		},
		text: { fontWeight: fontWeight.medium, color: 'var(--foreground-strong)' },
	});
</script>

<svelte:head>
	<title>Focus</title>
</svelte:head>

{#snippet drawn(mark: Mark, live: boolean)}
	<Tooltip label={mark.name}>
		{#if mark.kind === 'words'}
			<button
				type="button"
				tabindex={live ? 0 : -1}
				class={stylex.attrs(styles.reset, styles.text, ring.host, !live && ring.shownWords).class}
				style:font-size={fontSize[mark.size]}
			>
				<span class={stylex.attrs(ring.ink, descends(mark.text) && ring.descends).class}
					>{mark.text}</span
				>
			</button>
		{:else}
			<button
				type="button"
				tabindex={live ? 0 : -1}
				class={stylex.attrs(
					styles.reset,
					styles[mark.kind === 'primary' ? 'button' : mark.kind],
					mark.kind === 'primary' && styles.primary,
					ring.control,
					!live && ring.shownControl,
				).class}
			>
				{#if mark.kind === 'icon'}
					<Icon icon={SearchIcon} size={16} />
				{:else if mark.kind === 'field'}
					<Icon icon={SearchIcon} size={14} />{mark.text}
				{:else}
					{mark.text}
				{/if}
			</button>
		{/if}
	</Tooltip>
{/snippet}

<div class="flex flex-col gap-6">
	<Card
		title="Every Ring"
		rule="Everything the keyboard reaches is ringed in the same blue."
		rfc="qb7r9"
	>
		<Box row="{ALL_ROW}rem" ratio="1/3">
			<div class={stylex.attrs(styles.rows).class}>
				<div class={stylex.attrs(styles.row).class}>
					{#each CONTROLS as mark, index (index)}
						{@render drawn(mark, false)}
					{/each}
				</div>
				<div class={stylex.attrs(styles.row, styles.words).class}>
					{#each WORDS as mark, index (index)}
						{@render drawn(mark, false)}
					{/each}
				</div>
			</div>
		</Box>
	</Card>

	<Card title="Controls" rule="Controls are ringed flush on their own shape." rfc="mpy16">
		<Box row="{ROW}rem" ratio="1/2">
			<div class={stylex.attrs(styles.row).class}>
				{#each CONTROLS as mark, index (index)}
					{@render drawn(mark, false)}
				{/each}
			</div>
		</Box>
	</Card>

	<Card
		title="Words"
		rule="Words are ringed a fixed room off their letters, the corner growing with them."
		rfc="mpy16"
	>
		<Box row="{ROW}rem" ratio="1/2">
			<div class={stylex.attrs(styles.row, styles.words).class}>
				{#each WORDS as mark, index (index)}
					{@render drawn(mark, false)}
				{/each}
			</div>
		</Box>
	</Card>

	<Card
		title="Keyboard"
		rule="Only the keyboard draws a ring, and a pointer shows a tip instead."
		rfc="mpy16"
	>
		<Box row="{ROW}rem" ratio="1/2">
			<div class={stylex.attrs(styles.row).class}>
				{#each [...CONTROLS.slice(0, 3), ...WORDS.slice(1, 2)] as mark, index (index)}
					{@render drawn(mark, true)}
				{/each}
			</div>
		</Box>
	</Card>
</div>
