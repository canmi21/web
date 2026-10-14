/**
 * What each page asks of one node, typed: a node's host under `/api`, through `node()`. Every
 * helper is one request with a timeout, so a slow node cannot hold a page. See
 * spec/architecture/console.md, "It reads, and does not write, at first".
 */
import type { AppDetail, Checked, Disk, Grain, Now, Page, Point } from '../host.ts';
import type { Event, History } from '../wire.ts';
import { TIMEOUT } from './edge.ts';
import type { Node } from './nodes.ts';
import { type Edge, type Read, history as minutes, node } from './read.ts';

/** The ranges a chart offers. */
export type Range = '1h' | '6h' | '24h' | '7d' | '30d';

export interface Span {
	grain: Exclude<Grain, 'second'>;
	/** Seconds since the epoch, as the meter reads them. */
	since: number;
	until: number;
}

/**
 * Grain and bounds for a range. The meter keeps the machine's minutes for a day, so a range of a
 * day or less is drawn from them and every longer one from hours -- infra's
 * spec/architecture/meter.md, "Retention".
 */
export function range(of: Range, now = Math.floor(Date.now() / 1000)): Span {
	const hours = { '1h': 1, '6h': 6, '24h': 24, '7d': 168, '30d': 720 }[of];
	return { grain: hours <= 24 ? 'minute' : 'hour', since: now - hours * 3600, until: now };
}

/** A series asked for: `metrics` are names or dotted prefixes, none is every metric. */
export interface Series extends Span {
	metrics?: string[];
}

/** Query text for a span; keys in a fixed order so a request is the same string every time. */
function query(series: Partial<Series>): string {
	const asked = new URLSearchParams();
	if (series.grain) asked.set('grain', series.grain);
	if (series.metrics?.length) asked.set('metrics', series.metrics.join(','));
	if (series.since !== undefined) asked.set('since', String(series.since));
	if (series.until !== undefined) asked.set('until', String(series.until));
	const text = asked.toString();
	return text && `?${text}`;
}

function paged(page: Page): string {
	const asked = new URLSearchParams();
	if (page.before !== undefined) asked.set('before', String(page.before));
	if (page.limit !== undefined) asked.set('limit', String(page.limit));
	const text = asked.toString();
	return text && `?${text}`;
}

/** An app's name as one path segment; host refuses what it does not know. */
const segment = encodeURIComponent;

export const nodeNow = (edge: Edge, name: string): Promise<Read<Now>> =>
	node(edge, name, '/node/now', TIMEOUT);

export const nodeSeries = (edge: Edge, name: string, series: Series): Promise<Read<Point[]>> =>
	node(edge, name, `/node/series${query(series)}`, TIMEOUT);

/** Whether `metric` is one of `asked`, by name or a dotted prefix, as the meter reads them. */
const asks = (asked: string[] | undefined, metric: string) =>
	!asked?.length || asked.some((one) => metric === one || metric.startsWith(`${one}.`));

/**
 * `name`'s points from the nearest relay's minutes of it: each metric's mean, and the highest as
 * both bounds' upper, a slot a point; nothing where the relay holds no readings of it.
 */
export function pointsOf(history: History, name: string, asked?: string[]): Point[] {
	return (history.nodes[name] ?? []).flatMap((slot) => {
		const values = Object.entries(slot.readings ?? {}).filter(([metric]) => asks(asked, metric));
		if (!values.length) return [];
		const summary = ({ mean, max }: { mean: number; max: number }) => ({
			average: mean,
			minimum: mean,
			maximum: max,
			count: 1,
		});
		const at = Date.parse(slot.at) / 1000;
		return [
			{ at, values: Object.fromEntries(values.map(([metric, one]) => [metric, summary(one)])) },
		];
	});
}

/**
 * `name`'s series from its own host, or where its host does not answer, from the minutes every
 * relay holds of it, coarser: a minute's mean and highest, two days of minutes and 30 of hours.
 * The host's failure stands where the relay holds nothing either. Platform's RFC grmtb.
 */
export async function seriesOr(edge: Edge, name: Node, series: Series): Promise<Read<Point[]>> {
	const read = await nodeSeries(edge, name, series);
	if (read.ok) return read;
	// The relay answers at most a thousand slots: a day of minutes is asked two at a time.
	const unit = series.grain === 'minute' ? 60 : 3600;
	const slot = Math.ceil((series.until - series.since) / 1000 / unit) * unit || unit;
	const span = Math.ceil((series.until - series.since) / slot) * slot;
	const kept = await minutes(edge, span, slot, TIMEOUT, name);
	if (!kept.ok) return read;
	const points = pointsOf(kept.data, name, series.metrics);
	return points.length ? { ok: true, node: kept.node, data: points } : read;
}

export const apps = (edge: Edge, name: string): Promise<Read<AppDetail[]>> =>
	node(edge, name, '/apps', TIMEOUT);

export const app = (edge: Edge, name: string, of: string): Promise<Read<AppDetail>> =>
	node(edge, name, `/apps/${segment(of)}`, TIMEOUT);

/** Host asking the app's own `/health` for the console; see ../apps/health.ts. */
export const appHealth = (edge: Edge, name: string, of: string): Promise<Read<Checked>> =>
	node(edge, name, `/apps/${segment(of)}/health`, TIMEOUT);

/** An app's own metrics, `<name>.cpu` and the rest, at the span's grain. */
export const appSeries = (
	edge: Edge,
	name: string,
	of: string,
	span: Span,
): Promise<Read<Point[]>> =>
	node(edge, name, `/apps/${segment(of)}/metrics/series${query({ ...span })}`, TIMEOUT);

/** One app's events on one node, newest first. */
export const history = (
	edge: Edge,
	name: string,
	of: string,
	page: Page = {},
): Promise<Read<Event[]>> =>
	node(edge, name, `/apps/${segment(of)}/history${paged(page)}`, TIMEOUT);

/** Every app's events on one node, newest first. */
export const events = (edge: Edge, name: string, page: Page = {}): Promise<Read<Event[]>> =>
	node(edge, name, `/events${paged(page)}`, TIMEOUT);

export const disk = (edge: Edge, name: string): Promise<Read<Disk>> =>
	node(edge, name, '/inspect/disk', TIMEOUT);
