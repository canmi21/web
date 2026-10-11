import type { Nodes } from 'mdast';

/** A node's words, its marks and code taken as their text. */
export function textOf(node: Nodes): string {
	if ('value' in node && typeof node.value === 'string') return node.value;
	if ('children' in node) return node.children.map((child) => textOf(child as Nodes)).join('');
	return '';
}

/** A heading's anchor: its words in lowercase, joined by hyphens. */
export const anchorOf = (node: Nodes) =>
	textOf(node)
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-|-$/g, '');
