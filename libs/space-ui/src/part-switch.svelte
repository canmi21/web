<script lang="ts">
	/**
	 * The part being read, at the top bar's corner: its name leads to its own home, and the mark
	 * beside it opens a menu of every part, the one open checked. As the console's view switcher,
	 * with the name and the menu split. See spec/architecture/space.md.
	 */
	import * as stylex from '@stylexjs/stylex';
	import { DropdownMenu } from 'bits-ui';
	import CheckIcon from '@tabler/icons-svelte-runes/icons/check';
	import SelectorIcon from '@tabler/icons-svelte-runes/icons/selector';
	import Icon from '@canmi/design/components/icon.svelte';
	import { duration, fontWeight, radius } from '@canmi/design/scale.stylex';
	import MenuContent from './menu/menu-content.svelte';
	import MenuRow from './menu/menu-row.svelte';
	import { PARTS, reached, type Part } from './parts.ts';

	let { part, dev }: { part: Part; dev: boolean } = $props();

	/** The parts a reader can reach here, every other left out. */
	const reachable = $derived(PARTS.filter((one) => reached(one.key, dev)));

	const here = $derived(PARTS.find((one) => one.key === part)!);
	let corner: HTMLElement | undefined = $state();

	/**
	 * Back by a row's inset, its mark's column and the gap after it, so the parts' names stand
	 * under the corner's own, as ./menu/menu-row.svelte lays a row out.
	 */
	const UNDER_NAME = -(8 + 14 + 6);

	const styles = stylex.create({
		corner: { display: 'flex', alignItems: 'center', gap: '0.125rem' },
		name: {
			fontSize: '1rem', // unnamed: the corner's name, a step over the bar's links
			fontWeight: fontWeight.semibold,
			color: 'var(--foreground-strong)',
		},
		trigger: {
			display: 'inline-flex',
			alignItems: 'center',
			justifyContent: 'center',
			/** Half a square: as tall as the name's line, as wide as its mark, so it sits by the name. */
			width: '1rem',
			height: '1.5rem',
			borderWidth: 0,
			borderRadius: radius.md,
			cursor: 'pointer',
			color: { default: 'var(--foreground-muted)', ':hover': 'var(--foreground-strong)' },
			backgroundColor: { default: 'transparent', ':hover': 'var(--interaction-default)' },
			transitionProperty: 'background-color, color',
			transitionDuration: duration.base,
		},
	});
</script>

<div bind:this={corner} class={stylex.attrs(styles.corner).class}>
	<a href={here.href} class={stylex.attrs(styles.name).class}>{here.label}</a>
	<DropdownMenu.Root>
		<DropdownMenu.Trigger
			aria-label="Parts of canmi.app"
			class={stylex.attrs(styles.trigger).class}
		>
			<Icon icon={SelectorIcon} size={14} />
		</DropdownMenu.Trigger>
		<MenuContent label="Parts" anchor={corner} alignOffset={UNDER_NAME}>
			{#each reachable as one (one.key)}
				<MenuRow
					href={one.href}
					lead={one.icon}
					trail={one.key === part ? CheckIcon : undefined}
					current={one.key === part}>{one.label}</MenuRow
				>
			{/each}
		</MenuContent>
	</DropdownMenu.Root>
</div>
