/**
 * Every page the design system draws, by level: at the top, home and each category under the
 * layer that holds it; inside a category, its pages under the way back up -- as the console's
 * levels are, spec/console/navigation.md. One list, read by the sidebar, the top bar's layers and
 * home. See spec/architecture/space.md.
 */
import { resolve } from '$app/paths';
import type { Group, Page } from '@canmi/space-ui/pages-nav.svelte';
import BordersIcon from '@tabler/icons-svelte-runes/icons/border-outer';
import ColorIcon from '@tabler/icons-svelte-runes/icons/palette';
import GroundsIcon from '@tabler/icons-svelte-runes/icons/stack-2';
import HomeIcon from '@tabler/icons-svelte-runes/icons/home';
import HuesIcon from '@tabler/icons-svelte-runes/icons/color-swatch';
import InteractionIcon from '@tabler/icons-svelte-runes/icons/pointer';
import TextIcon from '@tabler/icons-svelte-runes/icons/typography';

/** A category: a page in the top level that is entered, its own pages replacing the sidebar. */
export interface Category extends Page {
	readonly pages: readonly Page[];
}

/** One of the system's layers, in the top bar, and the categories the top level lists under it. */
export interface Layer {
	readonly label: string;
	readonly categories: readonly Category[];
}

/** A page without `href` is named and not linked: it is not drawn yet. */
const COLOR: readonly Page[] = [
	{ label: 'Grounds', icon: GroundsIcon },
	{ label: 'Text', icon: TextIcon },
	{ label: 'Borders', icon: BordersIcon },
	{ label: 'Interaction', icon: InteractionIcon },
	{ href: resolve('/color/hues'), label: 'Hues', icon: HuesIcon },
];

/** The system's layers in the order each stands on the last. */
export const LAYERS: readonly Layer[] = [
	{
		label: 'Foundations',
		categories: [
			{ ...firstOf(COLOR), label: 'Color', icon: ColorIcon, enters: true, pages: COLOR },
		],
	},
	{ label: 'Primitives', categories: [] },
	{ label: 'Components', categories: [] },
	{ label: 'Layouts', categories: [] },
];

/** A category is entered at its first page drawn. */
function firstOf(pages: readonly Page[]): { href?: string } {
	return { href: pages.find((one) => one.href)?.href };
}

const HOME: Page = { href: resolve('/'), label: 'Home', icon: HomeIcon };

export type Level = { groups: readonly Group[]; up?: { href: string; label: string } };

/** Where `path` stands: the category whose pages hold it, and the layer holding that. */
function placeOf(path: string): { layer: Layer; category: Category } | undefined {
	for (const layer of LAYERS)
		for (const category of layer.categories)
			if (category.pages.some((one) => one.href === path)) return { layer, category };
	return undefined;
}

/** The level for the page at `path`: inside its category when it has one, else the top. */
export function levelOf(path: string): Level {
	const place = placeOf(path);
	if (place)
		return {
			up: { href: resolve('/'), label: 'Design' },
			groups: [{ pages: place.category.pages }],
		};
	return {
		groups: [
			{ pages: [HOME] },
			...LAYERS.filter((layer) => layer.categories.length > 0).map((layer) => ({
				label: layer.label,
				pages: layer.categories,
			})),
		],
	};
}

/** The layer holding the page at `path`, none at home. */
export function layerOf(path: string): Layer | undefined {
	return placeOf(path)?.layer;
}
