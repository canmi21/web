import { redirect } from '@sveltejs/kit';
import { describeKind, resourceRead } from '#lib/kinds/server.js';
import { catalog } from '#lib/server/control.js';
import { pagedHref } from '#lib/kinds/view.js';
import { viewOf } from '#lib/scope/scope.js';
import { edgeOf } from '#lib/server/platform.js';
import type { PageServerLoad } from './$types';

/** One resource of a kind with no page of its own, one page; see ../+page.server.ts. */
export const load: PageServerLoad = async (event) => {
	const edge = edgeOf(event);
	const { kind, resource } = event.params;
	const read = catalog(edge);
	const description = await describeKind(edge, kind, read);
	const view = viewOf(event.params.scope);
	const paged = description.ok ? pagedHref(view, description.data.name, resource) : undefined;
	if (paged !== undefined) redirect(307, paged);
	const page = resourceRead(edge, kind, resource, read);
	return { resource, read: event.isDataRequest ? page : await page };
};
