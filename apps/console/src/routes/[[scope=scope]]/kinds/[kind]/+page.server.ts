import { redirect } from '@sveltejs/kit';
import { describeKind, kindRead } from '#lib/kinds/server.js';
import { catalog } from '#lib/server/control.js';
import { pagedHref } from '#lib/kinds/view.js';
import { viewOf } from '#lib/scope/scope.js';
import { edgeOf } from '#lib/server/platform.js';
import type { PageServerLoad } from './$types';

/**
 * A kind the registry holds without a page of its own, drawn from the catalog alone; one with a
 * page is sent there. The catalog is awaited to know which. See spec/console/navigation.md.
 */
export const load: PageServerLoad = async (event) => {
	const edge = edgeOf(event);
	const read = catalog(edge);
	const description = await describeKind(edge, event.params.kind, read);
	const view = viewOf(event.params.scope);
	const paged = description.ok ? pagedHref(view, description.data.name) : undefined;
	if (paged !== undefined) redirect(307, paged);
	const page = kindRead(edge, event.params.kind, read);
	return { kind: event.params.kind, read: event.isDataRequest ? page : await page };
};
