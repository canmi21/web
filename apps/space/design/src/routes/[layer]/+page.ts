import { error, redirect } from '@sveltejs/kit';
import { leadOf } from '#lib/pages.ts';
import type { PageLoad } from './$types';

/** A layer is entered at its first page drawn; spec/architecture/space.md. */
export const load: PageLoad = ({ params }) => {
	const lead = leadOf(params.layer);
	if (!lead) error(404);
	redirect(308, lead);
};
