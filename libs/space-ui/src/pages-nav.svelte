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
	/** Each group of a part's pages under its heading, the page being read held selected. */
	import NavLink from '@canmi/design/components/nav-link.svelte';
	import NavHeading from './nav-heading.svelte';

	let { groups, label, path }: { groups: readonly Group[]; label: string; path: string } = $props();
</script>

<nav aria-label={label} class="flex flex-col gap-1">
	{#each groups as group, index (index)}
		{#if group.label}
			<NavHeading>{group.label}</NavHeading>
		{/if}
		{#each group.pages as one (one.href)}
			<NavLink {...one} current={path === one.href ? 'page' : false} />
		{/each}
	{/each}
</nav>
