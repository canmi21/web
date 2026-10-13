import { kindRead } from '#lib/kinds/server.js';
import { edgeOf } from '#lib/server/platform.js';
import type { PageServerLoad } from './$types';

/** Every account and the form creating one, held for the document's own response. */
export const load: PageServerLoad = async (event) => {
	const edge = edgeOf(event);
	const read = kindRead(edge, 'account');
	return { read: event.isDataRequest ? read : await read };
};
