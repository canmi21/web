/**
 * The sidebar's levels: at the top, home and each area; inside an area, its overview and its
 * RFCs, under the way back up -- as the console's levels are, spec/console/navigation.md. See
 * spec/architecture/space.md.
 */
import { resolve } from '$app/paths';
import type { Group } from '@canmi/space-ui/pages-nav.svelte';
import AreaIcon from '@tabler/icons-svelte-runes/icons/folder';
import HomeIcon from '@tabler/icons-svelte-runes/icons/home';
import OverviewIcon from '@tabler/icons-svelte-runes/icons/list';
import RfcIcon from '@tabler/icons-svelte-runes/icons/file-text';
import { rfcPath } from './rfc/name.ts';

/** An area as the layout's server hands it on: its name and its RFCs, newest first. */
export type Area = {
	scope: string;
	rfcs: readonly { slug: string; id: string; name: string }[];
};

export const titleOf = (scope: string) => scope.charAt(0).toUpperCase() + scope.slice(1);

export type Level = { groups: readonly Group[]; up?: { href: string; label: string } };

/** The level for the page being read: inside an area when it names one, else the top. */
export function levelOf(areas: readonly Area[], scope: string | undefined): Level {
	const area = areas.find((one) => one.scope === scope);
	if (!area)
		return {
			groups: [
				{ pages: [{ href: resolve('/'), label: 'Home', icon: HomeIcon }] },
				{
					label: 'Areas',
					pages: areas.map(({ scope: listed }) => ({
						href: resolve('/[scope]', { scope: listed }),
						label: titleOf(listed),
						icon: AreaIcon,
					})),
				},
			],
		};
	return {
		up: { href: resolve('/'), label: 'RFCs' },
		groups: [
			{
				pages: [
					{
						href: resolve('/[scope]', { scope: area.scope }),
						label: 'Overview',
						icon: OverviewIcon,
					},
				],
			},
			{
				label: titleOf(area.scope),
				pages: area.rfcs.map((rfc) => ({
					href: rfcPath(area.scope, rfc),
					label: rfc.name,
					icon: RfcIcon,
				})),
			},
		],
	};
}
