import { describe, expect, it } from 'vitest';
import { machineIn, readings, running, stateOf } from './node.ts';
import type { Held, State } from './wire.ts';

const HEARD = '2026-10-06T12:00:00Z';
const at = (seconds: number) => Date.parse(HEARD) + seconds * 1000;
const held = (state?: State, heardAt = HEARD): Held => ({
	version: 1,
	heard_at: heardAt,
	snapshot: { taken_at: heardAt, apps: [] },
	state,
});

describe("a node's state", () => {
	it("is what the relay says, whatever this browser's clock reads", () => {
		expect(stateOf(held('upgrading'), at(600))).toBe('upgrading');
		expect(stateOf(held('waiting'), at(0))).toBe('waiting');
		expect(stateOf(held('live'), at(600))).toBe('live');
		expect(stateOf(held('gone'), at(0))).toBe('gone');
	});

	it('is gone for a node the relay holds nothing of, and its own word for one not heard', () => {
		expect(stateOf(undefined, at(0))).toBe('gone');
		expect(stateOf({ state: 'waiting' }, at(0))).toBe('waiting');
		expect(stateOf({ state: 'gone' }, at(0))).toBe('gone');
	});

	describe('from a relay on the build before it sends one', () => {
		it('is live within ten seconds, late within a minute, and gone after', () => {
			expect(stateOf(held(), at(0))).toBe('live');
			expect(stateOf(held(), at(10))).toBe('live');
			expect(stateOf(held(), at(11))).toBe('late');
			expect(stateOf(held(), at(60))).toBe('late');
			expect(stateOf(held(), at(61))).toBe('gone');
		});

		it('counts a heard_at ahead of this browser clock as live', () => {
			expect(stateOf(held(), at(-5))).toBe('live');
		});

		it('counts a time it cannot read as gone', () => {
			expect(stateOf(held(undefined, 'yesterday'), at(0))).toBe('gone');
		});

		it('reads a word it does not know the same way, as a relay newer than it may send', () => {
			expect(stateOf(held('sleeping' as State), at(30))).toBe('late');
		});
	});
});

describe('readings', () => {
	it('reads the meter as host passes it on, each total where info has one', () => {
		const machine = {
			info: { cores: 2, memory: 8 * 2 ** 30, storage: 0 },
			sample: { at: 104, values: { 'cpu.usage': 12.5, 'memory.used': 2 ** 30, 'storage.used': 5 } },
		};
		expect(readings(machine)).toEqual({
			cpu: 12.5,
			load: undefined,
			memory: { used: 2 ** 30, total: 8 * 2 ** 30 },
			// A storage of zero is the meter not knowing, not a full disk.
			disk: { used: 5, total: undefined },
		});
	});

	it('reads nothing from a node with no meter, or from a shape it does not know', () => {
		expect(readings(undefined)).toBeUndefined();
		expect(readings({ sample: 1 })).toBeUndefined();
	});
});

describe("an entry's machine", () => {
	const info = { memory: 1000, cores: 2 };
	const entry = (over: Partial<Held>): Held => ({
		...held('live'),
		snapshot: { taken_at: HEARD, apps: [], machine: { info } },
		...over,
	});

	it('is the newest minute where nothing finer is held, and a watched second over it', () => {
		const readings = { at: HEARD, values: { 'cpu.usage': { mean: 12, max: 80 } } };
		const minute = machineIn(entry({ readings }));
		expect(minute).toEqual({
			info,
			sample: { at: Date.parse(HEARD) / 1000, values: { 'cpu.usage': 12 } },
		});
		const sample = { at: 9, values: { 'cpu.usage': 55 } };
		expect(machineIn(entry({ readings, sample }))?.sample).toEqual(sample);
	});

	it("is a relay's second where one before the change put it in the snapshot, and none where none", () => {
		const old = { info, sample: { at: 3, values: { 'cpu.usage': 7 } } };
		const carried = entry({ snapshot: { taken_at: HEARD, apps: [], machine: old } });
		expect(machineIn(carried)).toEqual(old);
		expect(readings(machineIn(carried))?.cpu).toBe(7);
		expect(machineIn(held('live'))).toBeUndefined();
	});
});

const app = (name: string, up: boolean, driver?: boolean) => ({
	name,
	image: 'x',
	deployed_at: '',
	running: up,
	held: false,
	...(driver === undefined ? {} : { driver }),
});

describe('apps running', () => {
	it('leaves a driver out of both numbers: it has no container to run or to be down', () => {
		const apps = [app('relay', true), app('geo', false), app('objects', false, true)];
		const node: Held = { ...held('live'), snapshot: { taken_at: HEARD, apps } };
		expect(running(node)).toEqual({ running: 1, total: 2 });
	});
});
