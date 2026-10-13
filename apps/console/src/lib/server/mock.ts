/**
 * What every read answers in development's mock mode: made up, shaped as the real answer is, so a
 * page is drawn whole with no node reached. Never in the build -- only an `Edge` with `mock` set
 * asks for it; see ./mode.ts.
 */
import type { AppDetail, Checked, Disk, MachineInfo, Now, Point, Summary } from '../host.ts';
import type { App, Cluster, Event, Held, History, Slot } from '../wire.ts';
import type { FleetEvent } from './fleet.ts';
import { NODES, type Node } from './nodes.ts';

const ALL = Object.keys(NODES) as Node[];

/** The apps every made-up node runs, a few of each scope. */
const APPS = ['caddy', 'host', 'keeper', 'meter', 'tunnel', 'relay', 'gateway', 'cdn', 'objects'];

const GIB = 1024 ** 3;

/** A number from 0 to 1, the same for the same words: a node's figures hold still across reads. */
function noise(...words: (string | number)[]): number {
	let hash = 2166136261;
	for (const char of words.join('/')) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619);
	hash = Math.imul(hash ^ (hash >>> 15), 2246822507);
	hash = Math.imul(hash ^ (hash >>> 13), 3266489909);
	return ((hash ^ (hash >>> 16)) >>> 0) / 4294967296;
}

/** A value wandering about `base` over time, `swing` either side, never below zero. */
const wander = (node: string, metric: string, at: number, base: number, swing: number) =>
	Math.max(
		0,
		base + swing * (Math.sin(at / 900 + noise(node, metric) * 6) + noise(node, metric, at) - 0.5),
	);

function info(node: string): MachineInfo {
	const cores = noise(node, 'cores') < 0.5 ? 4 : 8;
	return {
		model: 'Mock machine',
		kernel: '6.12.0',
		cores,
		clusters: [{ cores: [...Array(cores).keys()], max_frequency: 3000 }],
		memory: cores * 2 * GIB,
		swap: 2 * GIB,
		storage: 120 * GIB,
		booted: Math.floor(Date.now() / 1000) - Math.floor(noise(node, 'up') * 30 * 86400),
	};
}

/** One second of the machine, every metric the console draws. */
function values(node: string, at: number): Record<string, number> {
	const machine = info(node);
	const cpu = wander(node, 'cpu', at, 18, 14);
	return {
		'cpu.usage': cpu,
		'cpu.iowait': wander(node, 'iowait', at, 1, 1),
		...Object.fromEntries(
			machine.clusters[0]!.cores.map((core) => [
				`cpu.core.${core}.usage`,
				wander(node, `core${core}`, at, cpu, 10),
			]),
		),
		'load.1': (cpu / 100) * machine.cores,
		'load.5': (wander(node, 'load5', at, 18, 8) / 100) * machine.cores,
		'load.15': (wander(node, 'load15', at, 18, 4) / 100) * machine.cores,
		'memory.used': machine.memory * (0.35 + 0.2 * noise(node, 'memory')),
		'memory.cached': machine.memory * 0.2,
		'swap.used': machine.swap * 0.05,
		'storage.used': (machine.storage ?? 0) * (0.3 + 0.3 * noise(node, 'storage')),
		'network.sent': wander(node, 'sent', at, 400_000, 300_000),
		'network.received': wander(node, 'received', at, 600_000, 400_000),
		'disk.read': wander(node, 'read', at, 200_000, 150_000),
		'disk.written': wander(node, 'written', at, 300_000, 200_000),
		'temperature.soc': wander(node, 'soc', at, 48, 6),
		...Object.fromEntries(
			APPS.flatMap((app) => [
				[`${app}.cpu`, wander(node, `${app}.cpu`, at, 2, 2)],
				[`${app}.memory`, wander(node, `${app}.memory`, at, 120e6, 40e6)],
			]),
		),
	};
}

const now = (): number => Math.floor(Date.now() / 1000);

const iso = (seconds: number): string => new Date(seconds * 1000).toISOString();

const summary = (value: number): Summary => ({
	average: value,
	minimum: value * 0.8,
	maximum: value * 1.25,
	count: 60,
});

/** Buckets from `since` to `until` at `grain`, each metric `metrics` names or begins with. */
function series(node: string, query: URLSearchParams, prefix = ''): Point[] {
	const step = query.get('grain') === 'minute' ? 60 : 3600;
	const until = Number(query.get('until') ?? now());
	const since = Number(query.get('since') ?? until - 24 * 3600);
	const asked = query.get('metrics')?.split(',').filter(Boolean);
	const points: Point[] = [];
	for (let at = since - (since % step); at <= until; at += step) {
		const all = values(node, at);
		const kept = Object.entries(all).filter(([name]) => {
			if (prefix && !name.startsWith(prefix)) return false;
			return !asked || asked.some((one) => name === one || name.startsWith(`${one}.`));
		});
		points.push({ at, values: Object.fromEntries(kept.map(([name, v]) => [name, summary(v)])) });
	}
	return points;
}

/**
 * A node's events, newest first: a run every two and a half hours deploying one app, the same run
 * starting on every node at once, one placement in a hundred failing.
 */
function events(node: string, before = Infinity, limit = 30): Event[] {
	const list: Event[] = [];
	for (let id = 400; id > 0 && list.length < limit; id -= 1) {
		if (id >= before) continue;
		const started = now() - (400 - id) * 9000 - Math.floor(noise(id) * 3000);
		const failed = noise(node, id, 'outcome') < 0.01;
		list.push({
			id,
			app: APPS[Math.floor(noise(id, 'app') * APPS.length)]!,
			action: 'deploy',
			source: { kind: 'run', run: 9000 + id, commit: noise(id).toString(16).slice(2, 9) },
			outcome: failed ? 'failed' : 'succeeded',
			...(failed ? { detail: 'The image did not answer its health check.' } : {}),
			started_at: iso(started),
			finished_at: iso(started + 40 + Math.floor(noise(node, id, 'took') * 80)),
		});
	}
	return list;
}

function apps(node: string): App[] {
	return APPS.map((name) => ({
		name,
		image: `ghcr.io/canmi/${name}:mock`,
		deployed_at: iso(now() - Math.floor(noise(node, name) * 20 * 86400)),
		running: noise(node, name, 'running') > 0.03,
		held: false,
		rollout: 'replace',
	}));
}

function detail(app: App): AppDetail {
	const version = { manifest: { name: app.name, rollout: 'replace' }, image: app.image };
	return {
		...version,
		previous: { ...version, image: `ghcr.io/canmi/${app.name}:previous` },
		deployed_at: app.deployed_at,
		held: app.held,
		running: app.running,
		restorable: true,
		platform: ['caddy', 'host', 'keeper', 'tunnel'].includes(app.name),
		driver: app.name === 'objects',
		rollout: 'replace',
	};
}

function held(node: string): Held {
	return {
		version: Date.now(),
		heard_at: iso(now()),
		state: 'live',
		snapshot: {
			taken_at: iso(now()),
			events: events(node, Infinity, 10),
			apps: apps(node),
			machine: { info: info(node), sample: { at: now(), values: values(node, now()) } },
			round_trip: Object.fromEntries(
				ALL.filter((one) => one !== node).map((one) => [one, 0.02 + noise(node, one) * 0.25]),
			),
		},
	};
}

function cluster(node: Node): Cluster {
	return {
		version: 1,
		node,
		nodes: Object.fromEntries(ALL.map((one) => [one, held(one)])),
	};
}

function history(node: Node, query: URLSearchParams): History {
	const span = Number(query.get('span') ?? 86400);
	const slot = Number(query.get('slot') ?? 3600);
	const until = now() - (now() % slot);
	const from = until - span;
	const slots = (one: string): Slot[] => {
		const list: Slot[] = [];
		for (let at = from; at < until; at += slot) {
			const due = (slot / 60) * 20;
			const missing = noise(one, at, 'missing') < 0.005 ? 1 + Math.floor(noise(one, at) * 4) : 0;
			list.push({
				at: iso(at),
				beats: due - missing * 20,
				due,
				...(missing ? { missing } : {}),
				runs: { succeeded: noise(one, at, 'runs') < 0.06 ? 1 : 0 },
			});
		}
		return list;
	};
	return {
		version: 1,
		node,
		from: iso(from),
		until: iso(until),
		slot,
		nodes: Object.fromEntries(ALL.map((one) => [one, slots(one)])),
	};
}

/** Every node's runs of the last 30 days, newest first, as one relay mirrors them. */
function runs(node: Node, query: URLSearchParams) {
	const since = Number(query.get('since') ?? 0) / 1000;
	const all: FleetEvent[] = ALL.flatMap((one) =>
		events(one, Infinity, 300).map((event) => ({ ...event, node: one })),
	);
	return {
		version: 1,
		node,
		runs: all
			.filter((event) => Date.parse(event.started_at) / 1000 >= since)
			.sort((a, b) => b.started_at.localeCompare(a.started_at)),
	};
}

function checked(app: string): Checked {
	return {
		app,
		answered: true,
		code: 200,
		body: { status: 'ok' },
		checked_at: iso(now()),
	};
}

function disk(node: string): Disk {
	const storage = info(node).storage ?? 0;
	const used = values(node, now())['storage.used'] ?? 0;
	return {
		mounts: [{ path: '/', total: storage, used, available: storage - used }],
		apps: APPS.map((app) => ({
			app,
			bytes: Math.floor(noise(node, app, 'disk') * 4 * GIB),
			partial: false,
		})),
		snapshots: [],
	};
}

/** Made-up data for a relay's `path`, as answered by `node`'s relay. */
export function relayMock(node: Node, path: string): unknown {
	const url = new URL(path, 'http://mock');
	if (url.pathname === '/state') return cluster(node);
	if (url.pathname === '/history') return history(node, url.searchParams);
	if (url.pathname === '/runs') return runs(node, url.searchParams);
	return undefined;
}

/** Made-up data for `path` under `node`'s host's `/api`, or nothing for a path not made up. */
export function hostMock(node: Node, path: string): unknown {
	const url = new URL(path, 'http://mock');
	const query = url.searchParams;
	const parts = url.pathname.split('/').filter(Boolean).map(decodeURIComponent);
	const page = () => ({
		before: query.has('before') ? Number(query.get('before')) : undefined,
		limit: query.has('limit') ? Number(query.get('limit')) : undefined,
	});
	if (url.pathname === '/node/now') {
		return { info: info(node), sample: { at: now(), values: values(node, now()) } } satisfies Now;
	}
	if (url.pathname === '/node/series') return series(node, query);
	if (url.pathname === '/inspect/disk') return disk(node);
	if (url.pathname === '/events') {
		const { before, limit } = page();
		return events(node, before, limit);
	}
	if (parts[0] !== 'apps') return undefined;
	const listed = apps(node);
	if (parts.length === 1) return listed.map((app) => detail(app));
	const app = listed.find((one) => one.name === parts[1]);
	if (!app) return undefined;
	if (parts.length === 2) return detail(app);
	if (parts[2] === 'health') return checked(app.name);
	if (parts[2] === 'history') {
		const { before, limit } = page();
		return events(node, before, 200)
			.filter((event) => event.app === app.name)
			.slice(0, limit ?? 30);
	}
	if (parts[2] === 'metrics' && parts[3] === 'series') return series(node, query, `${app.name}.`);
	return undefined;
}
