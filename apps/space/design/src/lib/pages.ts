/**
 * Every page the design system draws, by the group the sidebar shows it under: one list, read by
 * the sidebar and the top bar's sections alike. See spec/architecture/space.md.
 */
import { resolve } from '$app/paths';
import type { Group, Page } from '@canmi/space-ui/pages-nav.svelte';
import HomeIcon from '@tabler/icons-svelte-runes/icons/home';
import ColorIcon from '@tabler/icons-svelte-runes/icons/palette';

export const GROUPS: readonly Group[] = [
	{ pages: [{ href: resolve('/'), label: 'Home', icon: HomeIcon }] },
	{ label: 'Foundations', pages: [{ href: resolve('/color'), label: 'Color', icon: ColorIcon }] },
];

/** The system's layers in the order each stands on the last; `href` is a layer's first page. */
export const SECTIONS: readonly { readonly label: string; readonly href?: string }[] = [
	{ label: 'Foundations', href: resolve('/color') },
	{ label: 'Primitives' },
	{ label: 'Components' },
	{ label: 'Layouts' },
];

/** The page at `path`, if the design system lists one there. */
export function pageAt(path: string): Page | undefined {
	return GROUPS.flatMap((group) => group.pages).find((page) => page.href === path);
}
