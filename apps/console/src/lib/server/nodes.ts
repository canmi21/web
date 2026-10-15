/**
 * The nodes a reader can be handed to, and the order a reader tries them in, nearest first. Where
 * each node is comes from control, never from here. See spec/architecture/console.md, "Live,
 * through the nearest node", and RFC 17b3o.
 */

/**
 * Every node this Worker reaches, by its id, each to the VPC binding wrangler.jsonc gives it, named
 * for the node's hostname in capitals -- the operator's name for it, never a key here; platform's
 * spec/architecture/control.md, "Who reads it, and with what". `pnpm map` holds each id to its
 * binding in infra's nodes/nodes.toml. With nothing to go by, a reader tries them in this order:
 * the three core nodes first, the ones at home last. See platform's spec/architecture/relay.md.
 */
export const NODES = {
	d132b0f553e3dcc3: 'TYO',
	'9d399312d1c3ddc4': 'SIN',
	a0a24bbaa0c0beba: 'GVX',
	e38f403f033d87f7: 'BUF',
	'055d9b63bb419ba4': 'NRT',
	'26bf596280326e7a': 'HND',
	abd3922110a78032: 'BRU',
	d62c82b23a858876: 'RDU',
	'0196b5a8439abb66': 'SHA',
} as const;

export type Node = keyof typeof NODES;

/** A node's VPC binding, as wrangler.jsonc names it. */
export type Binding = (typeof NODES)[Node];

const FIXED = Object.keys(NODES) as Node[];

/** Latitude and longitude in degrees. */
export type Coordinates = readonly [number, number];

/** The tiers and systems a node may declare, as control validates them. */
export const TIERS = ['datacenter', 'home', 'transient'] as const;
export const SYSTEMS = ['debian', 'alpine'] as const;

/**
 * What the console reads of a node in control: where it is, the city and country it is shown by,
 * whether it is a core, whether it is at home, its tier and system, and until when it is expected
 * to be held.
 */
export interface NodeFact {
	readonly coordinates?: Coordinates;
	readonly city?: string;
	/** ISO 3166's two letters, as infra's nodes.toml writes it: `JP`. */
	readonly country?: string;
	readonly core: boolean;
	readonly home?: boolean;
	readonly tier?: (typeof TIERS)[number];
	readonly system?: (typeof SYSTEMS)[number];
	/** A year; none for a node at home. */
	readonly expiry?: number;
}

/** Where each node is, as control last said; empty until it has said anything. */
let placed: Partial<Record<Node, Coordinates>> = {};

/** The cores, as control last said; none until it has said anything. */
let cores: readonly Node[] | undefined;

/**
 * What control said of the nodes, taken in: a node this Worker has no binding for is passed over,
 * since nothing could reach it.
 */
export function learnNodes(facts: Readonly<Record<string, NodeFact>>): void {
	const known = FIXED.filter((node) => Object.hasOwn(facts, node));
	placed = Object.fromEntries(
		known.flatMap((node) => {
			const coordinates = facts[node]?.coordinates;
			return coordinates ? [[node, coordinates]] : [];
		}),
	);
	cores = known.filter((node) => facts[node]?.core);
}

/** The cores control last named, or none where it has named none yet. */
export const learnedCores = (): readonly Node[] | undefined =>
	cores !== undefined && cores.length > 0 ? cores : undefined;

/** Who goes first when Cloudflare knows the reader's continent and not where on it. */
const BY_CONTINENT: Readonly<Record<string, readonly Node[]>> = {
	AS: [
		'd132b0f553e3dcc3',
		'9d399312d1c3ddc4',
		'055d9b63bb419ba4',
		'26bf596280326e7a',
		'0196b5a8439abb66',
	],
	EU: ['a0a24bbaa0c0beba', 'abd3922110a78032'],
	NA: ['e38f403f033d87f7', 'd62c82b23a858876'],
};

/** Where Cloudflare says the reader is, spelled as `request.cf` spells it. */
export interface Whereabouts {
	readonly latitude?: string;
	readonly longitude?: string;
	readonly continent?: string;
}

const EARTH_KM = 6371;

/** The great-circle distance between two points, in kilometers. */
export function distance(
	[latitudeA, longitudeA]: readonly [number, number],
	[latitudeB, longitudeB]: readonly [number, number],
): number {
	const radians = (degrees: number) => (degrees * Math.PI) / 180;
	const half =
		Math.sin(radians(latitudeB - latitudeA) / 2) ** 2 +
		Math.cos(radians(latitudeA)) *
			Math.cos(radians(latitudeB)) *
			Math.sin(radians(longitudeB - longitudeA) / 2) ** 2;
	return 2 * EARTH_KM * Math.asin(Math.sqrt(half));
}

/**
 * Every node, nearest `where` first: by distance where control has said where the nodes are, a
 * node it has not placed after those it has; else by continent; else in the fixed order.
 */
export function order(where: Whereabouts | undefined): Node[] {
	const reader = [
		Number.parseFloat(where?.latitude ?? ''),
		Number.parseFloat(where?.longitude ?? ''),
	] as const;
	if (reader.every(Number.isFinite) && Object.keys(placed).length > 0) {
		const away = (node: Node) => {
			const at = placed[node];
			return at ? distance(reader, at) : Number.POSITIVE_INFINITY;
		};
		return FIXED.toSorted((a, b) => (away(a) === away(b) ? 0 : away(a) - away(b)));
	}
	const first = BY_CONTINENT[where?.continent ?? ''] ?? [];
	return [...first, ...FIXED.filter((node) => !first.includes(node))];
}
