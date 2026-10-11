<script lang="ts">
	import { LAYERS } from '#lib/pages.js';

	/** Every category drawn so far, by the layer holding it. */
	const SECTIONS = LAYERS.filter((layer) => layer.categories.some((one) => one.href));
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
				{#each group.categories.filter((one) => one.href) as one (one.label)}
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
