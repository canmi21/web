import { tasks } from '#lib/server/control.js';
import { edgeOf } from '#lib/server/platform.js';
import { taskQueryOf } from '#lib/tasks/query.js';
import type { PageServerLoad } from './$types';

/** A page of the ledger's tasks as the query narrows them, held for the document's own response. */
export const load: PageServerLoad = async (event) => {
	const asked = taskQueryOf(event.url.searchParams);
	const read = tasks(edgeOf(event), asked);
	return { asked, read: event.isDataRequest ? read : await read };
};
