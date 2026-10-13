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
import LightAndDarkIcon from '@tabler/icons-svelte-runes/icons/contrast';
import HuesIcon from '@tabler/icons-svelte-runes/icons/color-swatch';
import MaterialsIcon from '@tabler/icons-svelte-runes/icons/texture';
import InteractionIcon from '@tabler/icons-svelte-runes/icons/pointer';
import TextIcon from '@tabler/icons-svelte-runes/icons/text-color';
import TypographyIcon from '@tabler/icons-svelte-runes/icons/typography';
import FamiliesIcon from '@tabler/icons-svelte-runes/icons/letter-case';
import SizesIcon from '@tabler/icons-svelte-runes/icons/text-size';
import WeightsIcon from '@tabler/icons-svelte-runes/icons/bold';
import LeadingIcon from '@tabler/icons-svelte-runes/icons/line-height';
import TrackingIcon from '@tabler/icons-svelte-runes/icons/letter-spacing';
import NumbersIcon from '@tabler/icons-svelte-runes/icons/numbers';
import StatesIcon from '@tabler/icons-svelte-runes/icons/click';
import FocusIcon from '@tabler/icons-svelte-runes/icons/focus-2';
import HoverIcon from '@tabler/icons-svelte-runes/icons/hand-finger';
import SelectionIcon from '@tabler/icons-svelte-runes/icons/select';
import DisabledIcon from '@tabler/icons-svelte-runes/icons/ban';

/** A category: a page in the top level that is entered, its own pages replacing the sidebar. */
export interface Category extends Page {
	/** Its segment of the address, after its layer's. */
	readonly slug: string;
	readonly pages: readonly Page[];
}

/**
 * One of the system's layers, in the top bar, and the categories the top level lists under it. A
 * layer is a level the reader never steps into: it has a segment of the address and names the way
 * back out of its categories, and the sidebar draws no list of its own for it.
 */
export interface Layer {
	readonly label: string;
	readonly slug: string;
	readonly categories: readonly Category[];
}

/** A page without `href` is named and not linked: it is not drawn yet. */
const COLOR: readonly Page[] = [
	{ href: resolve('/foundations/color/materials'), label: 'Materials', icon: MaterialsIcon },
	{ href: resolve('/foundations/color/grounds'), label: 'Grounds', icon: GroundsIcon },
	{ label: 'Text', icon: TextIcon },
	{ label: 'Borders', icon: BordersIcon },
	{ label: 'Interaction', icon: InteractionIcon },
	{
		href: resolve('/foundations/color/light-and-dark'),
		label: 'Light and Dark',
		icon: LightAndDarkIcon,
	},
	{ href: resolve('/foundations/color/hues'), label: 'Hues', icon: HuesIcon },
];

const TYPOGRAPHY: readonly Page[] = [
	{ label: 'Families', icon: FamiliesIcon },
	{ href: resolve('/foundations/typography/sizes'), label: 'Sizes', icon: SizesIcon },
	{ label: 'Weights', icon: WeightsIcon },
	{ href: resolve('/foundations/typography/leading'), label: 'Leading', icon: LeadingIcon },
	{ label: 'Tracking', icon: TrackingIcon },
	{ label: 'Numbers', icon: NumbersIcon },
];

const STATES: readonly Page[] = [
	{ href: resolve('/foundations/states/focus'), label: 'Focus', icon: FocusIcon },
	{ label: 'Hover', icon: HoverIcon },
	{ label: 'Selection', icon: SelectionIcon },
	{ label: 'Disabled', icon: DisabledIcon },
];

/** The system's layers in the order each stands on the last. */
export const LAYERS: readonly Layer[] = [
	{
		label: 'Foundations',
		slug: 'foundations',
		categories: [
			{
				...firstOf(COLOR),
				label: 'Color',
				slug: 'color',
				icon: ColorIcon,
				enters: true,
				pages: COLOR,
			},
			{
				...firstOf(TYPOGRAPHY),
				label: 'Typography',
				slug: 'typography',
				icon: TypographyIcon,
				enters: true,
				pages: TYPOGRAPHY,
			},
			{
				...firstOf(STATES),
				label: 'States',
				slug: 'states',
				icon: StatesIcon,
				enters: true,
				pages: STATES,
			},
		],
	},
	{ label: 'Primitives', slug: 'primitives', categories: [] },
	{ label: 'Components', slug: 'components', categories: [] },
	{ label: 'Layouts', slug: 'layouts', categories: [] },
];

/** A category is entered at its first page drawn, and a layer at its first category's. */
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
			up: { href: resolve('/'), label: place.layer.label },
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

/** Where a layer is entered: its first category's first page drawn, none while it has none. */
export function entryOf(layer: Layer): string | undefined {
	return layer.categories.find((one) => one.href)?.href;
}

/**
 * The page an address short of one leads to: a layer's, or a category's under it, entered at its
 * first page drawn. None where the address names neither.
 */
export function leadOf(layerSlug: string, categorySlug?: string): string | undefined {
	const layer = LAYERS.find((one) => one.slug === layerSlug);
	if (!layer) return undefined;
	if (categorySlug === undefined) return entryOf(layer);
	return layer.categories.find((one) => one.slug === categorySlug)?.href;
}
