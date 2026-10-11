import { RFCS, summaryOf } from '#lib/rfc/store.ts';
import type { PageServerLoad } from './$types';

export const prerender = true;

export const load: PageServerLoad = () => ({ rfcs: RFCS.map(summaryOf) });
