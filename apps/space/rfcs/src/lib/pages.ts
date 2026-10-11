/**
 * The sidebar's pages: every RFC, then each area's, in the order rfcs/scopes.yaml lists them. See
 * spec/architecture/space.md.
 */
import { resolve } from '$app/paths';
import type { Group } from '@canmi/space-ui/pages-nav.svelte';
import AreaIcon from '@tabler/icons-svelte-runes/icons/folder';
import AllIcon from '@tabler/icons-svelte-runes/icons/list';

/** The groups, given each area by name; names come from the server, which reads the list. */
export function groupsOf(areas: readonly string[]): readonly Group[] {
	return [
		{ pages: [{ href: resolve('/'), label: 'All', icon: AllIcon }] },
		{
			label: 'Areas',
			pages: areas.map((scope) => ({
				href: resolve('/[scope]', { scope }),
				label: scope.charAt(0).toUpperCase() + scope.slice(1),
				icon: AreaIcon,
			})),
		},
	];
}
