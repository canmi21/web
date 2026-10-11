import { dev } from '$app/env';
import { marks } from '@canmi/space-ui/marks';
import { AREAS } from '#lib/rfc/store.ts';
import type { LayoutServerLoad } from './$types';

/** The marks the head names, resolved at render, and the areas the sidebar lists. */
export const load: LayoutServerLoad = async () => ({
	marks: await marks(dev),
	areas: [...AREAS.keys()],
});
