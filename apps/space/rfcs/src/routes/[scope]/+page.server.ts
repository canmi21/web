import { error } from '@sveltejs/kit';
import { AREAS, RFCS, summaryOf } from '#lib/rfc/store.ts';
import type { EntryGenerator, PageServerLoad } from './$types';

export const prerender = true;

export const entries: EntryGenerator = () => [...AREAS.keys()].map((scope) => ({ scope }));

export const load: PageServerLoad = ({ params }) => {
	const about = AREAS.get(params.scope);
	if (!about) error(404, 'Not Found');
	return {
		scope: params.scope,
		about,
		rfcs: RFCS.filter((rfc) => rfc.scope === params.scope).map(summaryOf),
	};
};
