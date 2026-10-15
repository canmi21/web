/**
 * An account as its pages make it: in two steps, its provider and then its identities, one
 * optional value for each kind it may be known by, both edited later as any field is; and the
 * nodes under it, each attached and detached by a write of that node's `account`. Read from the
 * catalog's description of the kind, never known by heart past the two fields' names.
 * spec/console/navigation.md, and platform's RFC 32hd9.
 */
import type { Description, Field } from '../control/catalog.gen.ts';
import type { Resource, Spec } from '../control/types.ts';
import { nodeLabel } from '../map/places.ts';

/** The fields an account is made in two steps of: its provider, then its identities. */
export const PROVIDER = 'provider';
export const IDENTITIES = 'identities';

/** What the two steps hold between them, kept as typed when the reader goes back and forth. */
export interface Draft {
	provider: string;
	/** Each kind of identity's value as typed, empty where it was left out. */
	values: Record<string, string>;
}

/** The fields the two steps draw, as the catalog describes them; undefined where one is missing. */
export function stepsOf(description: Description) {
	const provider = description.fields.find((one) => one.name === PROVIDER);
	const identities = description.fields.find((one) => one.name === IDENTITIES);
	const kind = identities?.fields?.find((one) => one.required && one.type === 'choice');
	const value = identities?.fields?.find((one) => one !== kind);
	if (!provider || !identities || !kind || !value) return undefined;
	return { provider, identities, kind, value };
}

/** The choices of a field, none where it has none. */
export const choicesOf = (field: Field): readonly string[] => field.choices ?? [];

/** A kind of identity as a person reads it: `account_id` is `Account ID`. */
export const kindLabel = (kind: string): string =>
	kind
		.split('_')
		.map((word) => (word === 'id' ? 'ID' : `${word.charAt(0).toUpperCase()}${word.slice(1)}`))
		.join(' ');

/** Why step 1 cannot be left: no provider, or one the catalog does not list. */
export function providerProblem(draft: Draft, provider: Field): string | undefined {
	if (choicesOf(provider).includes(draft.provider)) return undefined;
	return 'Choose a provider.';
}

/** The identities a draft is sent with: each kind filled, trimmed, in the catalog's order. */
export const identitiesOf = (draft: Draft, kinds: readonly string[]) =>
	kinds
		.map((kind) => ({ kind, value: (draft.values[kind] ?? '').trim() }))
		.filter((one) => one.value !== '');

/** Why the account cannot be sent: no identity filled. */
export function identitiesProblems(draft: Draft, kinds: readonly string[]): string[] {
	return identitiesOf(draft, kinds).length === 0 ? ['Fill in at least one identity.'] : [];
}

/** The spec a finished draft is sent as, an empty identity left out. */
export const specOf = (draft: Draft, kinds: readonly string[]): Spec => ({
	[PROVIDER]: draft.provider,
	[IDENTITIES]: identitiesOf(draft, kinds),
});

/** A node that could be attached here, and whether attaching it moves it from another account. */
export interface Candidate {
	node: Resource;
	moves: boolean;
}

/** The nodes not under account `id`, those under no account first, each by what it is called. */
export function candidatesFor(nodes: readonly Resource[], id: string): Candidate[] {
	const under = (node: Resource) => node.spec.account;
	return nodes
		.filter((node) => under(node) !== id)
		.map((node) => ({ node, moves: typeof under(node) === 'string' && under(node) !== '' }))
		.toSorted(
			(a, b) =>
				Number(a.moves) - Number(b.moves) ||
				nodeLabel(a.node.id).localeCompare(nodeLabel(b.node.id)),
		);
}

/** The patch attaching a node to account `id`, or detaching it where `id` is null. */
export const accountPatch = (id: string | null): Spec => ({ account: id });

/**
 * Whether a node can be detached: its `account` is a field it may go without, so a merge patch's
 * `null` takes it out. Read off the catalog, since a required one could not be.
 */
export const detachable = (node: Description): boolean =>
	node.fields.some((one) => one.name === 'account' && one.editable && !one.required);
