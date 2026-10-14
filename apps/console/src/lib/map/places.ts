/**
 * What the console says of each node beyond where it is: its place, the name it is shown by, its
 * role in the relay, and how nodes in one place gather into one mark, all from what the registry
 * says of it -- RFC 17b3o. A role is one of the relay's three core nodes, a relay, or a relay at
 * home, which may go offline -- see platform's spec/architecture/relay.md.
 */
import type { Node, NodeFact } from '../server/nodes.ts';
import type { State } from '../wire.ts';
import { LOCATIONS } from './land.generated.ts';
import { type Shown, shown, worst } from './marks.ts';

export type Role = 'core' | 'relay' | 'home';

export interface Place {
	/** Where it is, as specific as is known: `Tokyo, Haneda`. */
	place: string;
	city: string;
	/** In full, as `displayName` reads it: `United States`, not `US`. */
	country: string;
	role: Role;
	/** The place it shares with other nodes, which the map draws as one mark. */
	cluster?: string;
}

/** A node the registry has not placed: named by its code, and a relay. */
const unplaced = (code: string): Place => ({
	place: code,
	city: code,
	country: code,
	role: 'relay',
});

/**
 * Each node as the registry last placed it, kept in the one object every reader holds; every node
 * unplaced until it has said anything.
 */
export const PLACES = Object.fromEntries(
	Object.keys(LOCATIONS).map((code) => [code, unplaced(code)]),
) as Record<Node, Place>;

/**
 * What the registry said of the nodes, taken in, on the server and in the browser alike. A `place`
 * is its city first and its country last, what tells it from another node in that city between
 * them; nodes sharing a city gather into one mark.
 */
export function learnPlaces(facts: Readonly<Record<string, NodeFact>>): void {
	const parts = (code: string) => facts[code]?.place?.split(', ') ?? [];
	const cities = Object.keys(PLACES).map((code) => parts(code)[0]);
	for (const code of Object.keys(PLACES) as Node[]) {
		const fact = facts[code];
		const named = parts(code);
		const [city, country] = [named[0], named.at(-1)];
		if (fact === undefined || city === undefined || country === undefined || named.length < 2) {
			PLACES[code] = unplaced(code);
			continue;
		}
		const shared = cities.filter((one) => one === city).length > 1;
		PLACES[code] = {
			place: named.slice(0, -1).join(', '),
			city,
			country,
			// At home before a core: rdu is both, and may go offline.
			role: fact.home ? 'home' : fact.core ? 'core' : 'relay',
			...(shared ? { cluster: city.toLowerCase() } : {}),
		};
	}
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
 * spec/architecture/console.md, "A node is shown by its city, and its code is the key".
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

/** A node's display name; a code the console does not place is named by itself. */
export function nameOf(code: string): Name {
	const place = PLACES[code as Node];
	return place ? displayName(place.city, place.country) : { full: code, short: code, lead: code };
}

/** Each country a node stands in, by its ISO 3166 code, which a flag is drawn from. */
const ISO: Readonly<Record<string, string>> = {
	Belgium: 'BE',
	China: 'CN',
	Japan: 'JP',
	Singapore: 'SG',
	Sweden: 'SE',
	'United Kingdom': 'GB',
	'United States': 'US',
};

/** The ISO 3166 code of the country a node is in, which its flag is drawn by; none if unknown. */
export function isoOf(code: string): string | undefined {
	return ISO[PLACES[code as Node]?.country ?? ''];
}

/** The country a node is in, in full -- `Japan`, `United States` -- or the code where unplaced. */
export function countryOf(code: string): string {
	return PLACES[code as Node]?.country ?? code;
}

/** What tells a node from the others at its place: `Narita`, of `Tokyo, Narita`. */
export function partOf(code: string): string {
	const place = PLACES[code as Node]?.place ?? code;
	return place.includes(', ') ? (place.split(', ').at(-1) ?? place) : place;
}

/**
 * The display name and the code in one string, where only text can be written -- an option, a
 * title, a chart's names: `Tokyo, Japan (tyo)`, or `Tokyo (tyo)` with `lead` where room is short.
 * Markup writes the code small beside the name instead, as src/lib/nodes/node-name.svelte does.
 */
export function nodeLabel(code: string, part: keyof Name = 'full'): string {
	const name = nameOf(code)[part];
	return name === code ? code : `${name} (${code})`;
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
	/** That nearest node's code. */
	nearest?: string;
	point: readonly [number, number];
}

/** A place as the map marks it: one node alone, or every node sharing it. */
export interface Site {
	/** The cluster, or the code of the node alone. */
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
