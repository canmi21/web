import { dev } from '$app/env';
import { marks } from '@canmi/space-ui/marks';
import { AREAS, RFCS } from '#lib/rfc/store.ts';
import type { LayoutServerLoad } from './$types';

/** The marks the head names, resolved at render, and each area with its RFCs for the sidebar. */
export const load: LayoutServerLoad = async () => ({
	marks: await marks(dev),
	areas: [...AREAS.keys()].map((scope) => ({
		scope,
		rfcs: RFCS.filter((rfc) => rfc.scope === scope).map(({ slug, id, front }) => ({
			slug,
			id,
			name: front.name,
		})),
	})),
});
