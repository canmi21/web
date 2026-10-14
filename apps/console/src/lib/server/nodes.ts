/**
 * The nodes a reader can be handed to, and the order a reader tries them in, nearest first. Where
 * each node is comes from the registry, never from here. See spec/architecture/console.md, "Live,
 * through the nearest node", and RFC 17b3o.
 */

/**
 * Every node this Worker reaches, each by the VPC binding wrangler.jsonc gives it, its code in
 * capitals. With nothing to go by, a reader tries them in this order: the three core nodes first,
 * the ones at home last. See platform's spec/architecture/relay.md.
 */
export const NODES = {
	tyo: 'TYO',
	sin: 'SIN',
	gvx: 'GVX',
	buf: 'BUF',
	nrt: 'NRT',
	hnd: 'HND',
	bru: 'BRU',
	rdu: 'RDU',
	sha: 'SHA',
} as const;

export type Node = keyof typeof NODES;

const FIXED = Object.keys(NODES) as Node[];

/** Latitude and longitude in degrees. */
export type Coordinates = readonly [number, number];

/**
 * What the console reads of a node in the registry: where it is, what it is called, whether it is a
 * core, and whether it is at home.
 */
export interface NodeFact {
	readonly coordinates?: Coordinates;
	readonly place?: string;
	readonly core: boolean;
	readonly home?: boolean;
}

/** Where each node is, as the registry last said; empty until it has said anything. */
let placed: Partial<Record<Node, Coordinates>> = {};

/** The cores, as the registry last said; none until it has said anything. */
let cores: readonly Node[] | undefined;

/**
 * What the registry said of the nodes, taken in: a node this Worker has no binding for is passed
 * over, since nothing could reach it.
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

/** The cores the registry last named, or none where it has named none yet. */
export const learnedCores = (): readonly Node[] | undefined =>
	cores !== undefined && cores.length > 0 ? cores : undefined;

/** Who goes first when Cloudflare knows the reader's continent and not where on it. */
const BY_CONTINENT: Readonly<Record<string, readonly Node[]>> = {
	AS: ['tyo', 'sin', 'nrt', 'hnd', 'sha'],
	EU: ['gvx', 'bru'],
	NA: ['buf', 'rdu'],
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
 * Every node, nearest `where` first: by distance where the registry has said where the nodes are,
 * a node it has not placed after those it has; else by continent; else in the fixed order.
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
