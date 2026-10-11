<script lang="ts">
	/** Each group of space's pages under its heading, the page being read held selected. */
	import { page } from '$app/state';
	import NavLink from '@canmi/design/components/nav-link.svelte';
	import NavHeading from './nav-heading.svelte';
	import { GROUPS } from './pages.ts';
</script>

<nav aria-label="Space" class="flex flex-col gap-1">
	{#each GROUPS as group, index (index)}
		{#if group.label}
			<NavHeading>{group.label}</NavHeading>
		{/if}
		{#each group.pages as one (one.href)}
			<NavLink {...one} current={page.url.pathname === one.href ? 'page' : false} />
		{/each}
	{/each}
</nav>
