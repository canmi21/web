import { task } from '#lib/server/control.js';
import { edgeOf } from '#lib/server/platform.js';
import type { PageServerLoad } from './$types';

/** One task of the ledger with its steps, held for the document's own response. */
export const load: PageServerLoad = async (event) => {
	const { service, task: id } = event.params;
	const read = task(edgeOf(event), service, id);
	return { service, id, read: event.isDataRequest ? read : await read };
};
