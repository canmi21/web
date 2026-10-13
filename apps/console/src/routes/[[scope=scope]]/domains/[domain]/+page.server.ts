import { nodesUnder, resourceRead } from '#lib/kinds/server.js';
import { recordViewOf } from '#lib/kinds/view.js';
import { edgeOf } from '#lib/server/platform.js';
import type { PageServerLoad } from './$types';

/**
 * The domain's open page: what the registry holds of it with its form, or the nodes naming
 * it. Held for the document's own response and streamed on a move, as every page's reads are.
 */
export const load: PageServerLoad = async (event) => {
	const edge = edgeOf(event);
	const name = event.params.domain;
	const { tab } = recordViewOf(event.url.searchParams);
	const overview = tab === 'overview' ? resourceRead(edge, 'domain', name) : undefined;
	const nodes = tab === 'nodes' ? nodesUnder(edge, 'domain', name) : undefined;
	return {
		name,
		overview: overview && (event.isDataRequest ? overview : await overview),
		nodes: nodes && (event.isDataRequest ? nodes : await nodes),
	};
};
