<script lang="ts">
	/**
	 * The pages of the level being read, the open one held selected, and inside a node or an app the
	 * way back up above them -- spec/console/navigation.md. On a move to a deeper or a shallower
	 * level the old list slides away as the new arrives.
	 */
	import { page } from '$app/state';
	import { untrack } from 'svelte';
	import BackIcon from '@tabler/icons-svelte-runes/icons/chevron-left';
	import * as stylex from '@stylexjs/stylex';
	import { duration, fontSize, fontWeight } from '@canmi/design/scale.stylex';
	import Icon from '@canmi/design/components/icon.svelte';
	import NavLink from '@canmi/design/components/nav-link.svelte';
	import type { Level } from '../levels.ts';
	import { pass } from './motion.ts';

	let { level }: { level: Level } = $props();

	/**
	 * Whether `href` is the page being read, query and all: a click there goes nowhere, and one from
	 * deeper -- a run under Deployments, a later page of Events -- goes back to it. See
	 * spec/console/navigation.md, "A page's own entry goes nowhere".
	 */
	function isHere(href: string): boolean {
		const to = new URL(href, page.url.href);
		return to.pathname === page.url.pathname && to.search === page.url.search;
	}

	function stay(event: MouseEvent, href: string) {
		const plain = event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey;
		if (plain && !event.altKey && isHere(href)) event.preventDefault();
	}

	/**
	 * The level drawn, and on a move to a deeper or a shallower one a copy of the old left over it to
	 * slide away as the new arrives. Taken before the DOM changes, played after.
	 */
	let panel: HTMLElement | undefined = $state();
	const identity = $derived(`${level.depth} ${level.up?.href ?? ''} ${level.name ?? ''}`);
	let shown = { identity: untrack(() => identity), depth: untrack(() => level.depth) };
	const leaving: { next?: { ghost: HTMLElement; way: 1 | -1 } } = {};
	$effect.pre(() => {
		const next = identity;
		const depth = level.depth;
		untrack(() => {
			if (next === shown.identity) return;
			if (panel && depth !== shown.depth) {
				const ghost = panel.cloneNode(true) as HTMLElement;
				ghost.inert = true;
				ghost.setAttribute('aria-hidden', 'true');
				Object.assign(ghost.style, {
					position: 'absolute',
					top: `${panel.offsetTop}px`,
					left: `${panel.offsetLeft}px`,
					width: `${panel.offsetWidth}px`,
				});
				leaving.next = { ghost, way: depth > shown.depth ? 1 : -1 };
			}
			shown = { identity: next, depth };
		});
	});
	$effect(() => {
		void identity;
		untrack(() => {
			const { next } = leaving;
			leaving.next = undefined;
			if (!next || !panel) return;
			// Not `after`, which the Workers types beside the DOM's take for HTMLRewriter's.
			panel.parentNode?.insertBefore(next.ghost, panel.nextSibling);
			pass(next.ghost, panel, next.way);
		});
	});

	const styles = stylex.create({
		/** The way back up: laid out as a page, with no ground of its own, hovered or not. */
		back: {
			color: { default: 'var(--foreground-muted)', ':hover': 'var(--foreground-strong)' },
			fontSize: fontSize.body,
			fontWeight: fontWeight.medium,
			transitionProperty: 'color',
			transitionDuration: duration.base,
		},
	});
</script>

<!-- A page's load starts on hover; see spec/architecture/console.md. -->
<nav aria-label={level.name ?? 'Sections'} data-sveltekit-preload-data="hover">
	<div bind:this={panel} class="flex flex-col gap-1">
		{#if level.up}
			<a
				href={level.up.href}
				class="flex h-9 items-center gap-2.5 px-3 {stylex.attrs(styles.back).class}"
			>
				<Icon icon={BackIcon} size={18} stroke={1.75} />
				{level.up.label}
			</a>
		{/if}
		{#each level.items as item (item.key)}
			{@const here = item.key === level.current}
			<!-- `page` where it is the page, `true` where the page is somewhere under it. -->
			<NavLink
				href={item.href}
				label={item.label}
				icon={item.icon}
				current={here ? (isHere(item.href) ? 'page' : 'true') : false}
				onclick={(event) => stay(event, item.href)}
			/>
		{/each}
	</div>
</nav>
