/**
 * How a node is, as the dot on its flag's corner says it: heard and every app running, leaving,
 * waiting, an app that should run and does not or a threshold the node judges held, or gone -- the
 * worst of those, and the words its hover gives. A place takes the worst of its nodes. See
 * spec/console/overview.md, "A flag's dot is how its node is", and platform's `alarm.rs`.
 */
import { partOf } from '../map/places.ts';
import { stateOf } from '../node.ts';
import { displayOf } from '../scope/scope.ts';
import type { Entry } from '../wire.ts';

export type Health = 'well' | 'waiting' | 'leaving' | 'down' | 'gone';

export interface Told {
	health: Health;
	/** Why, for the dot's hover. */
	said: string;
}

/** Worst first. */
const WORST: readonly Health[] = ['gone', 'down', 'leaving', 'waiting', 'well'];

const plural = (count: number, one: string) => `${count} ${one}${count === 1 ? '' : 's'}`;

/** What each alarm the node judges is called; a temperature zone's is its own. */
const ALARMS: Readonly<Record<string, string>> = {
	cpu: 'Processor at 90% or more',
	memory: 'Memory at 90% or more',
	storage: 'Storage at 90% or more',
};

const alarmOf = (alarm: string) =>
	ALARMS[alarm] ??
	(alarm.startsWith('temperature.') ? `${alarm.slice(12)} at 85 °C or more` : alarm);

export function healthOf(entry: Entry | undefined, now: number): Told {
	const state = stateOf(entry, now);
	if (state === 'gone') return { health: 'gone', said: 'Not heard' };
	if (state === 'upgrading') return { health: 'leaving', said: 'Upgrading' };
	if (state === 'restarting') return { health: 'leaving', said: 'Restarting' };
	if (state === 'waiting') return { health: 'waiting', said: 'Not heard yet' };
	const stopped = (entry?.snapshot?.apps ?? []).filter((app) => !app.running);
	const down = stopped.filter((app) => !app.held).map((app) => displayOf(app.name));
	const held = stopped.filter((app) => app.held).map((app) => displayOf(app.name));
	const aside = held.length ? `; ${plural(held.length, 'app')} held: ${held.join(', ')}` : '';
	const alarms = Object.keys(entry?.snapshot?.alarms ?? {}).map(alarmOf);
	const alarmed = alarms.length ? `; ${alarms.join(', ')}` : '';
	if (down.length) {
		return {
			health: 'down',
			said: `${plural(down.length, 'app')} down: ${down.join(', ')}${aside}${alarmed}`,
		};
	}
	if (alarms.length) return { health: 'down', said: `${alarms.join(', ')}${aside}` };
	return { health: 'well', said: `Every app running${aside}` };
}

/** The worst of a place's nodes, each named where there is more than one. */
export function worstOf(nodes: readonly { code: string; told: Told }[]): Told {
	const health = WORST.find((one) => nodes.some((node) => node.told.health === one)) ?? 'well';
	if (nodes.length === 1) return nodes[0]?.told ?? { health, said: '' };
	const said = nodes.map((node) => `${partOf(node.code)}: ${node.told.said}`).join('\n');
	return { health, said };
}
