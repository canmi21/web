import { nodesUnder, resourceRead } from '#lib/kinds/server.js';
import { recordViewOf } from '#lib/kinds/view.js';
import { edgeOf } from '#lib/server/platform.js';
import type { PageServerLoad } from './$types';

/**
 * The account's open page, addressed by its id since it has no name: what the registry holds of it
 * with its form, or the nodes naming it. Held for the document's own response and streamed on a
 * move, as every page's reads are. Platform's RFC 32hd9.
 */
export const load: PageServerLoad = async (event) => {
	const edge = edgeOf(event);
	const id = event.params.account;
	const { tab } = recordViewOf(event.url.searchParams);
	const overview = tab === 'overview' ? resourceRead(edge, 'account', id) : undefined;
	const nodes = tab === 'nodes' ? nodesUnder(edge, id) : undefined;
	return {
		id,
		overview: overview && (event.isDataRequest ? overview : await overview),
		nodes: nodes && (event.isDataRequest ? nodes : await nodes),
	};
};
