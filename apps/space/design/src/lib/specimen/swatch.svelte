<script lang="ts">
	/**
	 * One of the style's colors as a tile: a well on the surface, ringed in a hairline, and the color
	 * set into it, its corner the well's less the inset -- lib's spec/design/styles.md, "Of two
	 * corners nested". Named by its tip where nothing beside it names it; a press copies its token
	 * as code reads it and ticks it in the strongest text, each tick on its own clock.
	 */
	import * as stylex from '@stylexjs/stylex';
	import { borderWidth, radius } from '@canmi/design/scale.stylex';
	import Icon from '@canmi/design/components/icon.svelte';
	import Tooltip from '@canmi/design/components/tooltip.svelte';
	import CheckIcon from '@tabler/icons-svelte-runes/icons/check';
	import { frame } from './frame.stylex.ts';

	let {
		name,
		token,
		size = '4.5rem',
		tip = true,
		reach,
	}: {
		name: string;
		token: string;
		size?: string;
		/** Off where the name already stands beside it: lib's spec/design/components.md. */
		tip?: boolean;
		/** Half the gap to its neighbors, which its pointer area takes, unseen, on either side. */
		reach?: string;
	} = $props();

	let ticking: ReturnType<typeof setTimeout> | undefined = $state();

	async function copy() {
		await navigator.clipboard.writeText(`var(${token})`);
		clearTimeout(ticking);
		ticking = setTimeout(() => (ticking = undefined), 1200);
	}

	const appear = stylex.keyframes({
		from: { opacity: 0, transform: 'scale(0.6)' },
		to: { opacity: 1, transform: 'scale(1)' },
	});

	const styles = stylex.create({
		well: {
			position: 'relative',
			display: 'flex',
			padding: frame.well,
			borderWidth: 0,
			borderRadius: radius.lg,
			backgroundColor: 'var(--background-surface)',
			boxShadow: `0 0 0 ${borderWidth.hairline} var(--border-default)`,
			cursor: 'copy',
		},
		/**
		 * The well's unseen reach into half of each gap beside it, so the pointer crossing from one
		 * swatch to the next never leaves both and the tips follow it without a break.
		 */
		reach: {
			'::before': {
				content: '""',
				position: 'absolute',
				top: 0,
				bottom: 0,
				left: 'calc(-1 * var(--reach))',
				right: 'calc(-1 * var(--reach))',
			},
		},
		/** The color, ringed inside its own edge so one close to the well still has one. */
		color: {
			flexGrow: 1,
			borderRadius: `calc(${radius.lg} - ${frame.well})`,
			outlineWidth: borderWidth.hairline,
			outlineStyle: 'solid',
			outlineColor: 'var(--border-default)',
			outlineOffset: `calc(-1 * ${borderWidth.hairline})`,
		},
		tick: {
			position: 'absolute',
			inset: 0,
			display: 'flex',
			alignItems: 'center',
			justifyContent: 'center',
			color: 'var(--foreground-strong)',
			pointerEvents: 'none',
			animationName: appear,
			animationDuration: '150ms',
			animationTimingFunction: 'ease-out',
		},
	});
</script>

{#snippet well()}
	<button
		type="button"
		aria-label="Copy {token}, {name}"
		class={stylex.attrs(styles.well, reach !== undefined && styles.reach).class}
		style:--reach={reach}
		style:width={size}
		style:height={size}
		onclick={copy}
	>
		<span class={stylex.attrs(styles.color).class} style:background-color="var({token})"></span>
		{#if ticking}
			<span class={stylex.attrs(styles.tick).class}>
				<Icon icon={CheckIcon} size={18} stroke={3} />
			</span>
		{/if}
	</button>
{/snippet}

{#if tip}
	<Tooltip label={name}>{@render well()}</Tooltip>
{:else}
	{@render well()}
{/if}
