import { redirect } from '@sveltejs/kit';
import { resolve } from '$app/paths';
import type { PageLoad } from './$types';

/** Color is entered at its first page drawn; the address it had as one page still leads there. */
export const load: PageLoad = () => redirect(308, resolve('/color/hues'));
