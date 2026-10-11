<script lang="ts" module>
	import type { IconComponent } from '@canmi/design/components/icon';

	export interface Page {
		readonly href: string;
		readonly label: string;
		readonly icon: IconComponent;
	}

	export interface Group {
		/** None for the group at the top, which needs no heading. */
		readonly label?: string;
		readonly pages: readonly Page[];
	}
</script>

<script lang="ts">
	/**
	 * Each group of a level's pages under its heading, the page being read held selected, and inside
	 * a deeper level the way back up above them: a chevron and the name of the list it was entered
	 * from, laid out as a page with no ground of its own. As the console's sidebar, spec/console/
	 * navigation.md, "Entering a level replaces the sidebar with it".
	 */
	import * as stylex from '@stylexjs/stylex';
	import BackIcon from '@tabler/icons-svelte-runes/icons/chevron-left';
	import Icon from '@canmi/design/components/icon.svelte';
	import NavLink from '@canmi/design/components/nav-link.svelte';
	import { duration, fontSize, fontWeight } from '@canmi/design/scale.stylex';
	import NavHeading from './nav-heading.svelte';

	let {
		groups,
		label,
		path,
		up,
	}: {
		groups: readonly Group[];
		label: string;
		path: string;
		/** The list this level was entered from, absent at the top. */
		up?: { href: string; label: string };
	} = $props();

	const styles = stylex.create({
		back: {
			display: 'flex',
			alignItems: 'center',
			gap: '0.625rem',
			height: '2.25rem',
			paddingInline: '0.75rem',
			color: { default: 'var(--foreground-muted)', ':hover': 'var(--foreground-strong)' },
			fontSize: fontSize.body,
			fontWeight: fontWeight.medium,
			transitionProperty: 'color',
			transitionDuration: duration.base,
		},
	});
</script>

<nav aria-label={label} class="flex flex-col gap-1">
	{#if up}
		<a href={up.href} class={stylex.attrs(styles.back).class}>
			<Icon icon={BackIcon} size={18} stroke={1.75} />
			{up.label}
		</a>
	{/if}
	{#each groups as group, index (index)}
		{#if group.label}
			<NavHeading>{group.label}</NavHeading>
		{/if}
		{#each group.pages as one (one.href)}
			<NavLink {...one} current={path === one.href ? 'page' : false} />
		{/each}
	{/each}
</nav>
