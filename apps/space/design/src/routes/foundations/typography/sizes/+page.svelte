<script lang="ts">
	/**
	 * The type ladder: every size at once, then each kind on a card of its own, each size beside its
	 * name and value. A press on a size copies its const as code reads it. The ladder is RFC wb3ro's
	 * draft, held in src/lib/specimen/type.ts until it is decided.
	 */
	import * as stylex from '@stylexjs/stylex';
	import {
		borderWidth,
		fontSize,
		fontWeight,
		lineHeight,
		radius,
	} from '@canmi/design/scale.stylex';
	import Icon from '@canmi/design/components/icon.svelte';
	import Tooltip from '@canmi/design/components/tooltip.svelte';
	import CheckIcon from '@tabler/icons-svelte-runes/icons/check';
	import Box from '#lib/specimen/box.svelte';
	import Card from '#lib/specimen/card.svelte';
	import { descends, reach, ring } from '@canmi/space-ui/ring';
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

	/** The largest size, whose capitals the ladder's row stands as tall as. */
	const TALLEST = Math.max(...SIZES.map((size) => size.rem));

	/** A size's name as the page writes it. */
	const nameOf = (size: Size) => size.name[0]!.toUpperCase() + size.name.slice(1);

	const ticks = new Ticks();

	/** The interface's words with a shape of their own, ringed on it rather than on the words. */
	const shaped = new Set(['tag', 'secondary', 'primary']);

	const styles = stylex.create({
		/** Every size side by side on one baseline, smallest first. */
		all: {
			display: 'flex',
			flexWrap: 'wrap',
			alignItems: 'baseline',
			justifyContent: 'center',
			columnGap: `${GAP}rem`,
			rowGap: '1rem',
			'--reach': `${GAP / 2}rem`,
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
		/** In the line words are set in, so a ring stands off them as it does off any words. */
		glyphs: { fontWeight: fontWeight.medium },
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
		list: { display: 'flex', flexDirection: 'column', width: `min(100%, ${ROW}rem)` },
		/** A size's row, ruled off from the one above, its name and the size on one baseline. */
		row: {
			display: 'grid',
			gridTemplateColumns: '6rem minmax(0, 1fr)',
			alignItems: 'baseline',
			columnGap: '2rem',
			paddingBlock: '1.25rem',
			borderTopWidth: { default: borderWidth.hairline, ':first-child': 0 },
			borderTopStyle: 'solid',
			borderTopColor: 'var(--border-subtle)',
		},
		named: { display: 'flex', flexDirection: 'column', gap: '0.25rem' },
		/** Smaller than any size it names, so the sizes are what is read. */
		name: {
			fontSize: fontSize.caption,
			fontWeight: fontWeight.medium,
			color: 'var(--foreground-default)',
		},
		value: {
			display: 'flex',
			alignItems: 'center',
			height: '1rem',
			fontFamily: 'var(--font-mono)',
			fontSize: fontSize.caption,
			color: 'var(--foreground-subtle)',
		},
		/**
		 * A card as an app would draw one: a name, a note, a line, and two actions, each word's size
		 * named in its tip, a word alone, each line as wide as its words so a ring on it is too.
		 */
		mock: {
			display: 'flex',
			flexDirection: 'column',
			alignItems: 'flex-start',
			width: '20rem',
			// Set in the body, so its line and capitals are the first line's: the inset is measured to
			// what is drawn, the top to those capitals -- RFC 0gmzi.
			fontSize: fontSize.body,
			paddingTop: 'calc(1.25rem - (1lh - var(--font-sans-cap-height)) / 2)',
			paddingInline: '1.25rem',
			paddingBottom: '1.25rem',
			borderWidth: borderWidth.hairline,
			borderStyle: 'solid',
			borderColor: 'var(--border-default)',
			borderRadius: radius.xl,
			backgroundColor: 'var(--background-surface)',
			boxShadow: 'var(--shadow-surface)',
		},
		/** One line of the body tall, a pill beside the name standing out of it as it must. */
		head: {
			display: 'flex',
			alignSelf: 'stretch',
			height: '1lh',
			alignItems: 'center',
			justifyContent: 'space-between',
		},
		/** A word pressed to copy its size, drawn only as its look says. */
		reset: {
			padding: 0,
			borderWidth: 0,
			backgroundColor: 'transparent',
			textAlign: 'start',
			cursor: 'copy',
		},
		mockName: {
			fontSize: fontSize.body,
			fontWeight: fontWeight.medium,
			color: 'var(--foreground-strong)',
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
		/** Each line as wide as its words, so a ring on it is too. */
		note: { display: 'flex', alignSelf: 'flex-start', marginTop: '0.25rem' },
		noteWords: { fontSize: fontSize.caption, color: 'var(--foreground-muted)' },
		line: { display: 'flex', alignSelf: 'flex-start', marginTop: '1rem' },
		lineWords: { fontSize: fontSize.body, color: 'var(--foreground-default)' },
		actions: {
			display: 'flex',
			alignSelf: 'stretch',
			justifyContent: 'flex-end',
			gap: '0.5rem',
			marginTop: '1.25rem',
			'--reach': '0.25rem',
		},
		action: {
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
			color: 'var(--foreground-strong)',
		},
		primary: {
			borderColor: 'transparent',
			color: 'var(--background-base)',
			backgroundColor: 'var(--foreground-strong)',
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
		<Box row="{ALL_ROW}rem" ratio="1/3">
			<div class={stylex.attrs(styles.all).class}>
				{#each SIZES as size (size.name)}
					<span
						class={stylex.attrs(styles.glyphs, ring.line).class}
						style:font-size="{size.rem}rem"
					>
						<Tooltip label={nameOf(size)}>
							<button
								type="button"
								aria-label="Copy {constOf(size)}"
								class={stylex.attrs(styles.press, ring.host, ring.fit, reach.words).class}
								style:--reach-up="calc(({TALLEST / size.rem} - 1) * var(--font-sans-cap-height))"
								onclick={() => ticks.write(constOf(size), size.name)}
							>
								<span
									class={stylex.attrs(ring.ink, ring.fitted, ticks.has(size.name) && styles.hidden)
										.class}>Aa</span
								>
								{#if ticks.has(size.name)}
									<span class={stylex.attrs(styles.tick).class}>
										<Icon icon={CheckIcon} size={16} stroke={3} />
									</span>
								{/if}
							</button>
						</Tooltip>
					</span>
				{/each}
			</div>
		</Box>
	</Card>

	{#each GROUPS as group (group.look)}
		<Card title={group.title} rule={group.rule} rfc="wb3ro">
			<Box row="{ROW}rem" ratio="1/2">
				{#if group.look === 'interface'}
					{@render inUse()}
				{:else}
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
				{/if}
			</Box>
		</Card>
	{/each}
</div>

{#snippet inUse()}
	<div class={stylex.attrs(styles.mock).class}>
		<div class={stylex.attrs(styles.head).class}>
			{@render word('body', 'name', styles.mockName, 'Example')}
			{@render word('caption', 'tag', styles.pill, 'Tag')}
		</div>
		<div class={stylex.attrs(styles.note).class}>
			{@render word('caption', 'note', styles.noteWords, 'A caption under the name')}
		</div>
		<div class={stylex.attrs(styles.line).class}>
			{@render word(
				'body',
				'line',
				styles.lineWords,
				'A line of body text, as an interface sets it.',
			)}
		</div>
		<div class={stylex.attrs(styles.actions).class}>
			{@render word('label', 'secondary', styles.action, 'Secondary')}
			{@render word('label', 'primary', [styles.action, styles.primary], 'Primary')}
		</div>
	</div>
{/snippet}

<!-- A shape's tip points at the shape, words' at their capitals, their line kept around it. -->
{#snippet word(size: string, key: string, look: stylex.StyleXStyles, text: string)}
	{@const ticked = ticks.has(`interface-${key}`)}
	{@const label = size[0]!.toUpperCase() + size.slice(1)}
	{#if shaped.has(key)}
		<Tooltip {label} icon={ticked ? CheckIcon : undefined}>
			<button
				type="button"
				aria-label="Copy fontSize.{size}"
				class={stylex.attrs(styles.reset, look, ring.control, reach.mark).class}
				onclick={() => ticks.write(`fontSize.${size}`, `interface-${key}`)}>{text}</button
			>
		</Tooltip>
	{:else}
		{@const falls = descends(text)}
		<span class={stylex.attrs(look, ring.line).class}>
			<Tooltip {label} icon={ticked ? CheckIcon : undefined}>
				<button
					type="button"
					aria-label="Copy fontSize.{size}"
					class={stylex.attrs(
						styles.reset,
						ring.host,
						ring.fit,
						reach.words,
						falls && reach.descends,
					).class}
					onclick={() => ticks.write(`fontSize.${size}`, `interface-${key}`)}
				>
					<span class={stylex.attrs(ring.ink, ring.fitted, falls && ring.descends).class}
						>{text}</span
					>
				</button>
			</Tooltip>
		</span>
	{/if}
{/snippet}
