import { error, redirect } from '@sveltejs/kit';
import { rfcPath } from '#lib/rfc/name.ts';
import { AREAS, RFCS, rfcOf, summaryOf } from '#lib/rfc/store.ts';
import type { EntryGenerator, PageServerLoad } from './$types';

/**
 * Each area's list prerendered; an id in its place, as a rule cites an RFC, is rendered on
 * request and sent on to that RFC, since only the id names it. See RFC 2ut6h.
 */
export const prerender = 'auto';

export const entries: EntryGenerator = () => [...AREAS.keys()].map((scope) => ({ scope }));

export const load: PageServerLoad = ({ params }) => {
	const about = AREAS.get(params.scope);
	if (!about) {
		const rfc = rfcOf(params.scope);
		if (rfc) redirect(301, rfcPath(rfc.scope, rfc));
		error(404, 'Not Found');
	}
	return {
		scope: params.scope,
		about,
		rfcs: RFCS.filter((rfc) => rfc.scope === params.scope).map(summaryOf),
	};
};
