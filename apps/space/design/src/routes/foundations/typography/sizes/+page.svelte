<script lang="ts">
	/**
	 * The type ladder: every size at once, then each kind on a card of its own, each size beside its
	 * name and value. A press on a size copies its const as code reads it. The ladder is RFC wb3ro's
	 * draft, held in src/lib/specimen/type.ts until it is decided.
	 */
	import * as stylex from '@stylexjs/stylex';
	import { fontSize, fontWeight, lineHeight, radius } from '@canmi/design/scale.stylex';
	import Icon from '@canmi/design/components/icon.svelte';
	import Tooltip from '@canmi/design/components/tooltip.svelte';
	import CheckIcon from '@tabler/icons-svelte-runes/icons/check';
	import Box from '#lib/specimen/box.svelte';
	import Card from '#lib/specimen/card.svelte';
	import { Ticks } from '#lib/specimen/ticks.svelte.ts';
	import { SIZES, constOf, type Kind, type Size } from '#lib/specimen/type.ts';

	/** How a card sets its sizes: as its kind does, or as a figure, a heading's size in numbers. */
	type Look = Kind | 'figure';

	/** A size as a card shows it, with the line it sets there. */
	type Row = { size: Size; sample: string };

	const of = (kind: Kind): Row[] =>
		SIZES.filter((size) => size.kind === kind).map((size) => ({ size, sample: size.sample }));
	const display = SIZES.find((size) => size.name === 'display')!;

	/** Each card, in the order a page reads them. */
	const GROUPS: readonly { look: Look; title: string; rule: string; rows: Row[] }[] = [
		{
			look: 'interface',
			title: 'Interface',
			rule: 'Controls and the words beside them are set smaller than text to be read.',
			rows: of('interface'),
		},
		{
			look: 'reading',
			title: 'Reading',
			rule: "Text to be read is set at the size the reader's browser asks for.",
			rows: of('reading'),
		},
		{
			look: 'heading',
			title: 'Headings',
			rule: 'Titles step up from a section to a page to a document.',
			rows: of('heading'),
		},
		{
			look: 'figure',
			title: 'Figures',
			rule: 'A number read at a glance is set as large as a document title.',
			rows: [{ size: display, sample: '1,284' }],
		},
	];

	/** The first card's row, its gap, and the row every group's card is measured against, in rem. */
	const GAP = 2;
	const ALL_ROW = 22;
	const ROW = 36;

	/** A size's name as the page writes it. */
	const nameOf = (size: Size) => size.name[0]!.toUpperCase() + size.name.slice(1);

	const ticks = new Ticks();

	const styles = stylex.create({
		/** Every size side by side on one baseline, smallest first. */
		all: {
			display: 'flex',
			flexWrap: 'wrap',
			alignItems: 'baseline',
			justifyContent: 'center',
			columnGap: `${GAP}rem`,
			rowGap: '1rem',
		},
		/** A size pressed to copy it, its words kept in place under the tick. */
		press: {
			position: 'relative',
			padding: 0,
			borderWidth: 0,
			borderRadius: radius.sm,
			backgroundColor: 'transparent',
			color: 'var(--foreground-strong)',
			textAlign: 'start',
			cursor: 'copy',
		},
		glyphs: { fontWeight: fontWeight.medium, lineHeight: 1 },
		hidden: { visibility: 'hidden' },
		tick: {
			position: 'absolute',
			inset: 0,
			display: 'flex',
			alignItems: 'center',
			justifyContent: 'center',
			color: 'var(--foreground-strong)',
			pointerEvents: 'none',
		},
		/** A kind's sizes, each a row: its name and value, then the size itself. */
		list: {
			display: 'grid',
			gridTemplateColumns: '7rem minmax(0, 1fr)',
			alignItems: 'baseline',
			columnGap: '2rem',
			rowGap: '1.75rem',
			width: `min(100%, ${ROW}rem)`,
		},
		row: { display: 'contents' },
		named: { display: 'flex', flexDirection: 'column', gap: '0.125rem' },
		name: {
			fontSize: fontSize.body,
			fontWeight: fontWeight.medium,
			color: 'var(--foreground-strong)',
		},
		value: {
			display: 'flex',
			alignItems: 'center',
			height: '1rem',
			fontFamily: 'var(--font-mono)',
			fontSize: fontSize.caption,
			color: 'var(--foreground-muted)',
		},
		/** How each kind is set beside its size: a heading heavier, text to be read with room. */
		interface: { color: 'var(--foreground-default)' },
		reading: { lineHeight: lineHeight.relaxed, color: 'var(--foreground-default)' },
		heading: { fontWeight: fontWeight.semibold, letterSpacing: '-0.02em' },
		figure: {
			fontWeight: fontWeight.semibold,
			letterSpacing: '-0.02em',
			fontVariantNumeric: 'tabular-nums',
		},
	});
</script>

<svelte:head>
	<title>Sizes</title>
</svelte:head>

<div class="flex flex-col gap-6">
	<Card title="The Ladder" rule="Every word on a page is set at one of these sizes." rfc="wb3ro">
		<Box row="{ALL_ROW}rem" ratio="2/3">
			<div class={stylex.attrs(styles.all).class}>
				{#each SIZES as size (size.name)}
					<Tooltip label={nameOf(size)}>
						<button
							type="button"
							aria-label="Copy {constOf(size)}"
							class={stylex.attrs(styles.press, styles.glyphs).class}
							style:font-size="{size.rem}rem"
							onclick={() => ticks.write(constOf(size), size.name)}
						>
							<span class={stylex.attrs(ticks.has(size.name) && styles.hidden).class}>Aa</span>
							{#if ticks.has(size.name)}
								<span class={stylex.attrs(styles.tick).class}>
									<Icon icon={CheckIcon} size={16} stroke={3} />
								</span>
							{/if}
						</button>
					</Tooltip>
				{/each}
			</div>
		</Box>
	</Card>

	{#each GROUPS as group (group.look)}
		<Card title={group.title} rule={group.rule} rfc="wb3ro">
			<Box row="{ROW}rem" ratio="1/2">
				<div class={stylex.attrs(styles.list).class}>
					{#each group.rows as { size, sample } (size.name)}
						<div class={stylex.attrs(styles.row).class}>
							<div class={stylex.attrs(styles.named).class}>
								<span class={stylex.attrs(styles.name).class}>{nameOf(size)}</span>
								<span class={stylex.attrs(styles.value).class}>
									{#if ticks.has(`${group.look}-${size.name}`)}
										<Icon icon={CheckIcon} size={14} stroke={3} />
									{:else}
										{size.rem}rem
									{/if}
								</span>
							</div>
							<button
								type="button"
								aria-label="Copy {constOf(size)}"
								class={stylex.attrs(styles.press, styles[group.look]).class}
								style:font-size="{size.rem}rem"
								onclick={() => ticks.write(constOf(size), `${group.look}-${size.name}`)}
							>
								{sample}
							</button>
						</div>
					{/each}
				</div>
			</Box>
		</Card>
	{/each}
</div>
