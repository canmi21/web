/**
 * What the console says of each node beyond where it is: its place, the name it is shown by, its
 * role in the relay, and how nodes in one place gather into one mark, all from what control says
 * of it, a node by its id -- RFC 17b3o. A role is one of the relay's three core nodes, a relay, or
 * a relay at home, which may go offline -- see platform's spec/architecture/relay.md.
 */
import type { Node, NodeFact } from '../server/nodes.ts';
import type { State } from '../wire.ts';
import { LOCATIONS } from './land.generated.ts';
import { type Shown, shown, worst } from './marks.ts';

export type Role = 'core' | 'relay' | 'home';

export interface Place {
	/** Where it is, as specific as is known: its city. */
	place: string;
	city: string;
	/** In full, as `displayName` reads it: `United States`, not `US`. */
	country: string;
	/** ISO 3166's two letters, which its flag is drawn by; none where it is unplaced. */
	iso?: string;
	role: Role;
	/** The place it shares with other nodes, which the map draws as one mark. */
	cluster?: string;
}

/** How many of an id's digits stand for a node, at the fewest, where it is told from another. */
const DIGITS = 4;

/** A node control has not placed: named by its short id, and a relay. */
const unplaced = (code: string): Place => {
	const short = shortOf(code);
	return { place: short, city: short, country: short, role: 'relay' };
};

/**
 * Each node as control last placed it, by its id, kept in the one object every reader holds; every
 * node unplaced until it has said anything.
 */
export const PLACES = Object.fromEntries(
	Object.keys(LOCATIONS).map((code) => [code, unplaced(code)]),
) as Record<Node, Place>;

/** A country's name in full from its two letters, `JP` as `Japan`; the letters where unknown. */
function countryName(iso: string): string {
	try {
		return new Intl.DisplayNames(['en'], { type: 'region' }).of(iso) ?? iso;
	} catch {
		return iso;
	}
}

/**
 * What control said of the nodes, taken in, on the server and in the browser alike: each node's
 * city and country; nodes sharing a city gather into one mark.
 */
export function learnPlaces(facts: Readonly<Record<string, NodeFact>>): void {
	const at = (code: string) => {
		const { city, country } = facts[code] ?? {};
		return city && country ? `${city}, ${country}` : undefined;
	};
	const places = Object.keys(PLACES).map(at);
	for (const code of Object.keys(PLACES) as Node[]) {
		const fact = facts[code];
		const { city, country: iso } = fact ?? {};
		if (fact === undefined || !city || !iso) {
			PLACES[code] = unplaced(code);
			continue;
		}
		const shared = places.filter((one) => one === at(code)).length > 1;
		PLACES[code] = {
			place: city,
			city,
			country: countryName(iso),
			iso,
			// At home before a core: a node may be both, and may go offline.
			role: fact.home ? 'home' : fact.core ? 'core' : 'relay',
			...(shared ? { cluster: city.toLowerCase() } : {}),
		};
	}
}

/**
 * A node's id as it is written where it must be told from another: its first four digits, more
 * where another node's id starts with them. See spec/architecture/console.md, "A node is shown by
 * its city, and its id is the key".
 */
export function shortOf(code: string): string {
	const others = Object.keys(LOCATIONS).filter((one) => one !== code);
	let length = DIGITS;
	while (length < code.length && others.some((one) => one.startsWith(code.slice(0, length)))) {
		length += 1;
	}
	return code.slice(0, length);
}

/** The European Union's members, by the names `Place.country` spells them. */
export const EU: ReadonlySet<string> = new Set([
	'Austria',
	'Belgium',
	'Bulgaria',
	'Croatia',
	'Cyprus',
	'Czechia',
	'Denmark',
	'Estonia',
	'Finland',
	'France',
	'Germany',
	'Greece',
	'Hungary',
	'Ireland',
	'Italy',
	'Latvia',
	'Lithuania',
	'Luxembourg',
	'Malta',
	'Netherlands',
	'Poland',
	'Portugal',
	'Romania',
	'Slovakia',
	'Slovenia',
	'Spain',
	'Sweden',
]);

/** The countries and the union written short, where a name must be. */
const SHORT: Readonly<Record<string, string>> = {
	'United States': 'US',
	'United Kingdom': 'UK',
	'European Union': 'EU',
};

/**
 * A display name whole, the same written short, and its first part, which a tight cell writes
 * alone. `full` is what the console writes; `short` waits for a place too narrow for it. See
 * spec/architecture/console.md, "A node is shown by its city, and its id is the key".
 */
export interface Name {
	full: string;
	short: string;
	lead: string;
}

/**
 * A node's display name from its city and country: `Tokyo, Japan`, `Raleigh, United States`;
 * `Sweden, European Union` for a member of the union, whatever the city; and the country alone
 * where it is the city's name too, `Singapore`. Each has its short form beside it -- `Raleigh, US`,
 * `Sweden, EU`.
 */
export function displayName(city: string, country: string): Name {
	const short = (name: string) => SHORT[name] ?? name;
	if (EU.has(country)) {
		const union = 'European Union';
		return { full: `${country}, ${union}`, short: `${country}, ${short(union)}`, lead: country };
	}
	if (city === country) return { full: country, short: country, lead: country };
	return { full: `${city}, ${country}`, short: `${city}, ${short(country)}`, lead: city };
}

/** A node's display name; a node the console does not place is named by its short id. */
export function nameOf(code: string): Name {
	const place = PLACES[code as Node];
	if (place) return displayName(place.city, place.country);
	const short = shortOf(code);
	return { full: short, short, lead: short };
}

/** The ISO 3166 code of the country a node is in, which its flag is drawn by; none if unknown. */
export function isoOf(code: string): string | undefined {
	return PLACES[code as Node]?.iso;
}

/** The country a node is in, in full -- `Japan`, `United States` -- or its short id, unplaced. */
export function countryOf(code: string): string {
	return PLACES[code as Node]?.country ?? shortOf(code);
}

/**
 * A node's short id where another node is shown by the same `part` of its name, which tells the two
 * apart; none where its name is its own.
 */
export function apartOf(code: string, part: keyof Name = 'full'): string | undefined {
	const name = nameOf(code)[part];
	const shared = Object.keys(PLACES).some((one) => one !== code && nameOf(one)[part] === name);
	return shared ? shortOf(code) : undefined;
}

/**
 * What tells a node from the others at its place: its city, and its short id where it shares the
 * city with another, `Tokyo (d132)`.
 */
export function partOf(code: string): string {
	const place = PLACES[code as Node];
	if (place === undefined) return shortOf(code);
	return place.cluster ? `${place.city} (${shortOf(code)})` : place.city;
}

/**
 * The display name in one string, where only text can be written -- an option, a title, a chart's
 * names: `Singapore`, `Tokyo, Japan (d132)` where another node shares the name, or `Tokyo (d132)`
 * with `lead` where room is short. Markup writes the short id small beside the name instead, as
 * src/lib/nodes/node-name.svelte does.
 */
export function nodeLabel(code: string, part: keyof Name = 'full'): string {
	const name = nameOf(code)[part];
	const apart = apartOf(code, part);
	return apart === undefined ? name : `${name} (${apart})`;
}

export const ROLES: Record<Role, string> = { core: 'Core', relay: 'Relay', home: 'Home' };

/** Who leads a place by role, before the apps running and the node order. */
const STANDING: Record<Role, number> = { core: 0, relay: 1, home: 2 };

/** One node as its place's mark reads it. */
export interface Member {
	code: string;
	role: Role;
	cluster: string | undefined;
	/** As the relay says it, which the card words; the mark draws it as `shown` reads it. */
	state: State;
	/** Apps running, of how many listed. */
	apps: { running: number; total: number } | undefined;
	/** Total and used memory in bytes, and CPU percent now. */
	memory: number | undefined;
	used: number | undefined;
	cpu: number | undefined;
	/** When it was last heard; never, where it has not been. */
	heard: string | undefined;
	/** When its machine started, in seconds since the epoch, where its meter says. */
	booted?: number;
	/** Its round trip to its nearest node in milliseconds, where its relay has timed one lately. */
	latency?: number;
	/** That nearest node's id. */
	nearest?: string;
	point: readonly [number, number];
}

/** A place as the map marks it: one node alone, or every node sharing it. */
export interface Site {
	/** The cluster, or the id of the node alone. */
	key: string;
	/** Its nodes, the one that leads first. */
	members: Member[];
	point: [number, number];
	/** Memory and apps running summed over what is known, and the busiest CPU known. */
	memory: number | undefined;
	apps: number | undefined;
	cpu: number | undefined;
	/** The worst of its nodes': gone over leaving over heard. */
	state: Shown;
}

/** Members in the order a place reads them: role, then more apps running, then node order. */
export function rank(members: readonly Member[]): Member[] {
	return members
		.map((member, order) => ({ member, order }))
		.toSorted(
			(a, b) =>
				STANDING[a.member.role] - STANDING[b.member.role] ||
				(b.member.apps?.running ?? -1) - (a.member.apps?.running ?? -1) ||
				a.order - b.order,
		)
		.map(({ member }) => member);
}

/**
 * The node a relay timed the least round trip to, and that round trip in seconds; none where it
 * has timed no other lately.
 */
export function nearestOf(
	round_trip: Readonly<Record<string, number>> | undefined,
): { code: string; seconds: number } | undefined {
	let nearest: { code: string; seconds: number } | undefined;
	for (const [code, seconds] of Object.entries(round_trip ?? {})) {
		if (nearest === undefined || seconds < nearest.seconds) nearest = { code, seconds };
	}
	return nearest;
}

/** Every node gathered into its place's site, in node order of each place's first node. */
export function gather(members: readonly Member[]): Site[] {
	const places = new Map<string, Member[]>();
	for (const member of members) {
		const key = member.cluster ?? member.code;
		places.set(key, [...(places.get(key) ?? []), member]);
	}
	return [...places].map(([key, group]) => {
		const known = <T>(read: (member: Member) => T | undefined) =>
			group.flatMap((member) => {
				const value = read(member);
				return value === undefined ? [] : [value];
			});
		const sum = (values: number[]) =>
			values.length ? values.reduce((a, b) => a + b, 0) : undefined;
		const cpus = known((member) => member.cpu);
		const mean = (axis: 0 | 1) =>
			group.reduce((total, { point }) => total + point[axis], 0) / group.length;
		return {
			key,
			members: rank(group),
			point: [mean(0), mean(1)],
			memory: sum(known((member) => member.memory)),
			apps: sum(known((member) => member.apps?.running)),
			cpu: cpus.length ? Math.max(...cpus) : undefined,
			state: worst(group.map((member) => shown(member.state))),
		};
	});
}
