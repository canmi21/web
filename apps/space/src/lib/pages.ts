/**
 * Every page space draws, by the group the sidebar shows it under: one list, read by the sidebar
 * and the top bar's trail alike. See spec/architecture/space.md.
 */
import type { IconComponent } from '@canmi/design/components/icon';
import ColorIcon from '@tabler/icons-svelte-runes/icons/palette';
import OverviewIcon from '@tabler/icons-svelte-runes/icons/layout-grid';

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
	{ pages: [{ href: '/design', label: 'Overview', icon: OverviewIcon }] },
	{ label: 'Foundations', pages: [{ href: '/design/color', label: 'Color', icon: ColorIcon }] },
];

/** The page at `path`, if space lists one there. */
export function pageAt(path: string): Page | undefined {
	return GROUPS.flatMap((group) => group.pages).find((page) => page.href === path);
}
