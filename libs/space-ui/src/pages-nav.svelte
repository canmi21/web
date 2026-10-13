<script lang="ts" module>
	import type { IconComponent } from '@canmi/design/components/icon';

	export interface Page {
		/** None for a page not drawn yet, named in the list and not linked. */
		readonly href?: string;
		readonly label: string;
		readonly icon: IconComponent;
		/** Set where the page is a level of its own, entered: a chevron at its end says so. */
		readonly enters?: boolean;
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
	 * a deeper level the way back up above them: a back arrow and the name of the list it was
	 * entered from, an entry as any other, so it is tinted and ringed as one. On a move to a deeper
	 * or a shallower level the old list slides away as the new arrives. As the console's sidebar,
	 * spec/console/navigation.md, "Entering a level replaces the sidebar with it".
	 */
	import * as stylex from '@stylexjs/stylex';
	import { untrack } from 'svelte';
	import BackIcon from '@tabler/icons-svelte-runes/icons/arrow-left';
	import EnterIcon from '@tabler/icons-svelte-runes/icons/chevron-right';
	import Icon from '@canmi/design/components/icon.svelte';
	import NavLink from '@canmi/design/components/nav-link.svelte';
	import { duration, fontSize, fontWeight } from '@canmi/design/scale.stylex';
	import NavHeading from './nav-heading.svelte';
	import { pass } from './slide.ts';

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

	/**
	 * The level drawn, and on a move to a deeper or a shallower one a copy of the old left over it to
	 * slide away as the new arrives. Taken before the DOM changes, played after.
	 */
	let panel: HTMLElement | undefined = $state();
	const depth = $derived(up ? 1 : 0);
	const identity = $derived(`${up?.href ?? ''} ${groups.map((group) => group.label).join(' ')}`);
	let shown = { identity: untrack(() => identity), depth: untrack(() => depth) };
	const leaving: { next?: { ghost: HTMLElement; way: 1 | -1 } } = {};
	$effect.pre(() => {
		const next = identity;
		const now = depth;
		untrack(() => {
			if (next === shown.identity) return;
			if (panel && now !== shown.depth) {
				const ghost = panel.cloneNode(true) as HTMLElement;
				ghost.inert = true;
				ghost.setAttribute('aria-hidden', 'true');
				Object.assign(ghost.style, {
					position: 'absolute',
					top: `${panel.offsetTop}px`,
					left: `${panel.offsetLeft}px`,
					width: `${panel.offsetWidth}px`,
				});
				leaving.next = { ghost, way: now > shown.depth ? 1 : -1 };
			}
			shown = { identity: next, depth: now };
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
		/** The chevron of a page entered, at its end, letting the pointer through to the link. */
		enters: {
			position: 'absolute',
			insetBlock: 0,
			right: '0.75rem',
			display: 'flex',
			alignItems: 'center',
			pointerEvents: 'none',
			transitionProperty: 'color',
			transitionDuration: duration.base,
		},
		/** A page not drawn yet: laid out as a link, in the subtle tone, answering no pointer. */
		absent: {
			display: 'flex',
			alignItems: 'center',
			gap: '0.625rem',
			height: '2.25rem',
			paddingInline: '0.75rem',
			color: 'var(--foreground-subtle)',
			fontSize: fontSize.body,
			fontWeight: fontWeight.medium,
			cursor: 'not-allowed',
		},
	});
</script>

<nav aria-label={label}>
	<div bind:this={panel} class="flex flex-col gap-1">
		{#if up}
			<NavLink href={up.href} label={up.label} icon={BackIcon} />
		{/if}
		{#each groups as group, index (index)}
			{#if group.label}
				<NavHeading>{group.label}</NavHeading>
			{/if}
			{#each group.pages as one (one.href ?? one.label)}
				{#if one.href && one.enters}
					<div class="group relative">
						<NavLink {...one} href={one.href} current={path === one.href ? 'page' : false} />
						<span
							class="{stylex.attrs(styles.enters)
								.class} text-(--foreground-subtle) group-hover:text-(--foreground-strong)"
						>
							<Icon icon={EnterIcon} size={16} stroke={1.75} />
						</span>
					</div>
				{:else if one.href}
					<NavLink {...one} href={one.href} current={path === one.href ? 'page' : false} />
				{:else}
					<span aria-disabled="true" class={stylex.attrs(styles.absent).class}>
						<Icon icon={one.icon} size={18} stroke={1.75} />
						{one.label}
					</span>
				{/if}
			{/each}
		{/each}
	</div>
</nav>
