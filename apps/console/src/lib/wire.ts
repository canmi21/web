/**
 * What a relay sends a browser, as apps/system/relay writes it: `live.rs` for the socket's two
 * messages, `own.rs` for a snapshot, `host.rs` for its events and apps. A word host owns -- an
 * action, an outcome, a stage -- stays a string, since host may add to it. A snapshot carries no
 * events; they are read from the runs, `/runs`, whenever a node's `runs` moves -- platform's RFC
 * grmtb.
 */

/** The contract this console reads; a relay speaking another is not read. */
export const CONTRACT = 1;

export interface Source {
	/** `run`, `upload`, `panel`, or `keeper` for keeper's acts on host; host may add more. */
	kind: string;
	run?: number;
	commit?: string;
}

export interface Event {
	id: number;
	app: string;
	action: string;
	source: Source;
	image?: string;
	/** `running`, `succeeded`, `failed` or `skipped`. */
	outcome: string;
	/** `downloading` to `draining`, as ./deployments/state.ts orders them. */
	stage?: string;
	/** Why it failed; on a skip of an app deployed by hand, the command that deploys it. */
	detail?: string;
	started_at: string;
	finished_at?: string;
}

export interface App {
	name: string;
	image: string;
	deployed_at: string;
	running: boolean;
	held: boolean;
	/** Absent until the relay passes host's on; see ./apps/rollout.ts. */
	rollout?: string;
}

export interface Snapshot {
	taken_at: string;
	apps: App[];
	/**
	 * The meter's `{ info }`, what does not change while the machine is up; absent where no meter is
	 * deployed. A relay before platform's RFC grmtb sends `{ info, sample }`, its second beside it.
	 */
	machine?: unknown;
	/** The parts the node's last round failed to read, each held at what was read before. */
	stale?: string[];
	/**
	 * Its relay's round trip to each neighbor's, in seconds, by node, from a relay before RFC
	 * grmtb; the entry's `round_trip` since. Platform's spec/architecture/relay.md, "The round trip
	 * to each neighbor".
	 */
	round_trip?: Record<string, number>;
	/** The thresholds the node judges held, each since when; platform's `alarm.rs`. */
	alarms?: Record<string, { since: string }>;
	/**
	 * Its relay's last word before it stopped on purpose: why, and the seconds it means to be back
	 * within. Platform's spec/architecture/relay.md, "A node says it is leaving before it goes".
	 */
	leaving?: { reason: 'upgrade' | 'restart'; within: number };
}

/** A node as the answering relay reads it; see `Snapshot.leaving` for where it is defined. */
export type State = 'live' | 'late' | 'upgrading' | 'restarting' | 'waiting' | 'gone';

/** A metric over a minute or longer: its mean, and the highest it was. */
export interface Gauge {
	mean: number;
	max: number;
}

/** A node's readings over its newest minute held: when it began, and each meter metric. */
export interface Minutely {
	at: string;
	values: Record<string, Gauge>;
}

/** The meter's second, as a watched node's relay lends it: when, in seconds, and each metric. */
export interface Second {
	at?: number;
	values: Record<string, number>;
}

/** What either shape of an entry carries beside what is held. */
interface Beside {
	/**
	 * The version of the node's runs the answering relay holds, absent where it holds none or is on
	 * a build before it: a page reads the runs again when it moves.
	 */
	runs?: number;
	/** Its newest minute's readings, coarse; absent from a relay before RFC grmtb. */
	readings?: Minutely;
	/** Its relay's round trip to each neighbor, in seconds, over its newest minute. */
	round_trip?: Record<string, number>;
	/** The console's own, never a relay's: a watched node's latest second, from `readings`. */
	sample?: Second;
}

/** What a relay holds of one node. */
export interface Held extends Beside {
	/** The node's own clock in milliseconds; higher is newer. */
	version: number;
	/** When its origin last spoke, its newest beat, as the answering relay holds it. */
	heard_at: string;
	snapshot: Snapshot;
	/** Absent from a relay on the build before it; see ./node.ts, `stateOf`. */
	state?: State;
}

/** A peer the answering relay has not heard since it started, `waiting` and then `gone`. */
export interface Unheard extends Beside {
	state: State;
	version?: undefined;
	heard_at?: undefined;
	snapshot?: undefined;
}

/** One node as a relay sends it: what it holds, or its state alone. */
export type Entry = Held | Unheard;

/** Every node at once: `/state`'s data, and a socket's first message. */
export interface Cluster {
	version: number;
	/** The node whose relay answered. */
	node: string;
	nodes: Record<string, Entry>;
}

/** What changed of a list of rows keyed by `name`: rows new or changed, names gone, a new order. */
export interface Rows {
	set?: Record<string, unknown>[];
	unset?: string[];
	order?: string[];
}

/** What changed of an object: keys set whole, keys gone, and its `apps` as rows by name. */
export interface Changes {
	set?: Record<string, unknown>;
	unset?: string[];
	apps?: Rows;
}

/**
 * What changed of a node's entry since the one this socket was last sent, to a socket that asked
 * for deltas: its own keys, and its snapshot's. `base` is the version that entry held; one this
 * console does not hold means the socket is opened again. Platform's RFC grmtb.
 */
export interface EntryDelta {
	type: 'delta';
	node: string;
	base?: number;
	set?: Record<string, unknown>;
	unset?: string[];
	snapshot?: Changes;
}

/**
 * A relay's message: the whole cluster, a node's entry, what changed of one, that a node was heard,
 * or a watched node's second. A type this console does not know is passed over, so a relay ahead
 * of it never breaks it.
 */
export type Live =
	| ({ type: 'cluster' } & Cluster)
	| { type: 'node'; node: string; state: Entry }
	| EntryDelta
	| { type: 'beat'; node: string; heard_at: string }
	| { type: 'readings'; node: string; sample: Second };

/**
 * One slot of one node's history, as `/history` answers it: absent where it holds nothing.
 * Platform's spec/architecture/relay.md, "Each node's minutes, kept for a year".
 */
export interface Slot {
	at: string;
	/** The rounds that read host, of those `due`, twenty a minute. */
	beats?: number;
	due?: number;
	/** Minutes unheard, and of them those after a minute that said it was leaving. */
	missing?: number;
	announced?: number;
	/** Minutes that said the node was leaving. */
	leaving?: number;
	/** Each app's rounds down. */
	down?: Record<string, number>;
	/** Each neighbor's round trip, in seconds. */
	round_trip?: Record<string, { mean: number; worst: number }>;
	/** The machine's readings over it, where asked: the mean of its minutes, and the highest. */
	readings?: Record<string, Gauge>;
	runs?: { succeeded?: number; failed?: number; running?: number; partly_failed?: number };
}

/** Every node's history over a span, `/history`'s data. */
export interface History {
	version: number;
	node: string;
	from: string;
	until: string;
	/** Seconds a slot. */
	slot: number;
	nodes: Record<string, Slot[]>;
}
