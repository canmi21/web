<script lang="ts">
	import { GROUPS } from '#lib/pages.js';

	/** Every page under the overview, by its group. */
	const SECTIONS = GROUPS.filter((group) => group.label !== undefined);
</script>

<svelte:head>
	<title>Design</title>
</svelte:head>

<div class="flex max-w-3xl flex-col gap-8">
	<header class="flex flex-col gap-2">
		<h1 class="text-xl font-medium text-(--foreground-strong)">Design</h1>
		<p class="text-(--foreground-muted)">
			One contract of names every component reads, and a style that gives each a value in light and
			in dark; a scale of measures that no style changes; and the components standing on them.
			Everything here is drawn from the code itself.
		</p>
	</header>
	{#each SECTIONS as group (group.label)}
		<section class="flex flex-col gap-2">
			<h2 class="font-medium text-(--foreground-strong)">{group.label}</h2>
			<ul class="flex flex-col gap-1">
				{#each group.pages as one (one.href)}
					<li>
						<a href={one.href} class="text-(--foreground-muted) hover:text-(--foreground-strong)"
							>{one.label}</a
						>
					</li>
				{/each}
			</ul>
		</section>
	{/each}
</div>
