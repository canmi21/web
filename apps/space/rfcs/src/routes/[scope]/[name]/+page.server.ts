import { error, redirect } from '@sveltejs/kit';
import { syntaxTree } from '@canmi/compile/parser';
import { anchorOf, textOf } from '@canmi/space-ui/prose/text';
import type { Root } from 'mdast';
import { rfcPath } from '#lib/rfc/name.ts';
import { RFCS, rfcOf } from '#lib/rfc/store.ts';
import type { EntryGenerator, PageServerLoad } from './$types';

/**
 * Every RFC prerendered at its own path; any other path ending in an id is rendered on request
 * and sent to where that RFC is now, since only the id names it. See RFC 2ut6h.
 */
export const prerender = 'auto';

export const entries: EntryGenerator = () =>
	RFCS.map((rfc) => ({ scope: rfc.scope, name: `${rfc.slug}-${rfc.id}` }));

/** A tree without the source positions, which nothing drawn reads and every page would carry. */
const bare = (tree: Root): Root =>
	JSON.parse(JSON.stringify(tree, (key, value) => (key === 'position' ? undefined : value)));

export const load: PageServerLoad = ({ params }) => {
	const rfc = rfcOf(params.name.slice(-5));
	if (!rfc || params.name.at(-6) !== '-') error(404, 'Not Found');
	const path = rfcPath(rfc.scope, rfc);
	if (params.scope !== rfc.scope || params.name !== `${rfc.slug}-${rfc.id}`) redirect(301, path);
	const tree = bare(syntaxTree(rfc.body));
	return {
		scope: rfc.scope,
		day: rfc.day,
		id: rfc.id,
		front: rfc.front,
		supersededBy: rfc.supersededBy,
		paths: Object.fromEntries(RFCS.map((one) => [one.id, rfcPath(one.scope, one)])),
		tree,
		/** The body's sections, for the rail beside it. */
		sections: tree.children
			.filter((node) => node.type === 'heading' && node.depth === 2)
			.map((node) => ({ anchor: anchorOf(node), title: textOf(node) })),
	};
};
