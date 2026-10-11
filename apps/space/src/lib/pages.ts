/**
 * Every page space draws, by the group the sidebar shows it under: one list, read by the sidebar
 * and the top bar's sections alike. See spec/architecture/space.md.
 */
import type { IconComponent } from '@canmi/design/components/icon';
import HomeIcon from '@tabler/icons-svelte-runes/icons/home';
import ColorIcon from '@tabler/icons-svelte-runes/icons/palette';

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

export const GROUPS: readonly Group[] = [
	{ pages: [{ href: '/design', label: 'Home', icon: HomeIcon }] },
	{ label: 'Foundations', pages: [{ href: '/design/color', label: 'Color', icon: ColorIcon }] },
];

/** The system's layers in the order each stands on the last; `href` is a layer's first page. */
export const SECTIONS: readonly { readonly label: string; readonly href?: string }[] = [
	{ label: 'Foundations', href: '/design/color' },
	{ label: 'Primitives' },
	{ label: 'Components' },
	{ label: 'Layouts' },
];

/** The page at `path`, if space lists one there. */
export function pageAt(path: string): Page | undefined {
	return GROUPS.flatMap((group) => group.pages).find((page) => page.href === path);
}
