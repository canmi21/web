/**
 * One node as its card reads it: its state as the relay says it, and the few machine readings
 * worth a glance. The readings are the meter's, as infra's apps/deploy/panel reads them.
 */
import type { App, Entry, Held, Second, State } from './wire.ts';

const STATES: ReadonlySet<string> = new Set<State>([
	'live',
	'late',
	'upgrading',
	'restarting',
	'waiting',
	'gone',
]);

/**
 * What the relay says of a node, and gone for one it holds nothing of. The relay reads it and the
 * browser never does -- spec/architecture/console.md, "A node has three states on the map".
 */
export function stateOf(entry: Entry | undefined, now: number): State {
	if (entry?.state !== undefined && STATES.has(entry.state)) return entry.state;
	if (entry?.heard_at === undefined) return 'gone';
	return heardSince(entry.heard_at, now);
}

/** What `entry` holds of its node, and nothing for a peer its relay has not heard. */
export function heldOf(entry: Entry | undefined): Held | undefined {
	return entry?.version === undefined ? undefined : entry;
}

/**
 * The rollout's stand-in, for a relay on the build before `state`: removed once every relay sends
 * it -- platform's spec/architecture/relay.md, "A node says it is leaving before it goes".
 */
function heardSince(heardAt: string, now: number): State {
	const heard = Date.parse(heardAt);
	if (Number.isNaN(heard)) return 'gone';
	const silent = now - heard;
	if (silent <= 10_000) return 'live';
	if (silent <= 60_000) return 'late';
	return 'gone';
}

export interface Readings {
	/** Percent, 0 to 100. */
	cpu?: number;
	load?: number;
	/** Bytes used, and of how many where the meter says. */
	memory?: { used: number; total?: number };
	disk?: { used: number; total?: number };
	/** When the machine started, in seconds since the epoch. */
	booted?: number;
}

/**
 * The meter's `{ info, sample }` as an entry carries it: the info its snapshot holds, and the
 * freshest second there is -- a watched node's, else its newest minute's means, else the one a
 * relay before platform's RFC grmtb put in the snapshot. Nothing where it carries neither.
 */
export function machineIn(
	entry: Entry | undefined,
): { info?: unknown; sample?: Second } | undefined {
	const machine = entry?.snapshot?.machine;
	const carried = isRecord(machine) ? machine : {};
	const readings = entry?.readings;
	const minute = readings && {
		at: Date.parse(readings.at) / 1000,
		values: Object.fromEntries(
			Object.entries(readings.values).map(([name, one]) => [name, one.mean]),
		),
	};
	const old = isRecord(carried.sample) ? (carried.sample as unknown as Second) : undefined;
	const sample = entry?.sample ?? minute ?? old;
	if (carried.info === undefined && sample === undefined) return undefined;
	return { info: carried.info, sample };
}

/** What the meter's `{ info, sample }` says of the machine, or nothing where it is not that. */
export function readings(machine: unknown): Readings | undefined {
	if (!isRecord(machine) || !isRecord(machine.sample) || !isRecord(machine.sample.values)) {
		return undefined;
	}
	const values = machine.sample.values;
	const info = isRecord(machine.info) ? machine.info : {};
	const used = (metric: string, total: unknown) => {
		const value = values[metric];
		if (typeof value !== 'number') return undefined;
		return { used: value, total: typeof total === 'number' && total > 0 ? total : undefined };
	};
	const number = (metric: string) =>
		typeof values[metric] === 'number' ? (values[metric] as number) : undefined;
	return {
		cpu: number('cpu.usage'),
		load: number('load.1'),
		memory: used('memory.used', info.memory),
		disk: used('storage.used', info.storage),
		booted: typeof info.booted === 'number' && info.booted > 0 ? info.booted : undefined,
	};
}

/** The apps that run as containers of their own, a driver aside: it runs neither way. */
export const serving = <T extends Pick<App, 'driver'>>(apps: readonly T[]): T[] =>
	apps.filter((app) => !app.driver);

/** Running and total, of the apps a node lists, drivers aside. */
export function running(held: Held): { running: number; total: number } {
	const apps = serving(held.snapshot.apps);
	return { running: apps.filter((app) => app.running).length, total: apps.length };
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}
