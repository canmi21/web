import { error } from '@sveltejs/kit';
import { viewOf } from '#lib/scope/scope.js';
import type { LayoutLoad } from './$types';

/**
 * What the nodes stand on is infra's, read under All and Infra alone, as the nodes are; see
 * spec/console/navigation.md.
 */
export const load: LayoutLoad = ({ params }) => {
	const view = viewOf(params.scope);
	if (view !== 'all' && view !== 'infra') error(404, 'The domains are read in Infra.');
};
