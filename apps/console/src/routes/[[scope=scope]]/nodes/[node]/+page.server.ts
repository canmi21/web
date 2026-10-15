import { error } from '@sveltejs/kit';
import type { Drift } from '#lib/control/types.js';
import { resourceRead } from '#lib/kinds/server.js';
import { markers, nodeCharts } from '#lib/nodes/charts.js';
import { PAGE, olderThan, viewOf } from '#lib/nodes/view.js';
import { edgeOf } from '#lib/server/platform.js';
import { cluster, isNode, node } from '#lib/server/read.js';
import { apps, disk, events, nodeNow, range, seriesOr } from '#lib/server/reads.js';
import type { PageServerLoad } from './$types';

/** How many of the node's latest events the charts look through for deploys to mark. */
const MARKED = 200;

/**
 * The header's reads on every tab, and the open tab's own beside them, all streamed so a tab is a
 * link that switches at once, the cluster held for the document's own response. A read that fails
 * comes back as its failure, said in its place on the page. See spec/architecture/console.md,
 * "Moving between pages never waits for a node".
 */
export const load: PageServerLoad = async (event) => {
	const name = event.params.node;
	if (!isNode(name)) error(404, `No node has the id ${name}.`);
	const edge = edgeOf(event);
	const view = viewOf(event.url.searchParams);
	const span = range(view.range);
	const on = <T>(tab: typeof view.tab, read: () => Promise<T>) =>
		view.tab === tab ? read() : undefined;

	return {
		cluster: event.isDataRequest ? cluster(edge) : await cluster(edge),
		name,
		view,
		span,
		now: Date.now(),
		machine: nodeNow(edge, name),
		overview: on('overview', () =>
			Promise.all([seriesOr(edge, name, span), events(edge, name, { limit: MARKED })]).then(
				([series, recent]) => ({
					charts: series.ok ? { ...series, data: nodeCharts(series.data) } : series,
					marks: recent.ok ? markers(recent.data, span.since, span.until) : [],
				}),
			),
		),
		apps: on('apps', () => apps(edge, name)),
		events: on('events', () =>
			events(edge, name, { limit: PAGE, before: view.before }).then((page) => ({
				read: page,
				older: page.ok ? olderThan(page.data.map((one) => one.id)) : undefined,
			})),
		),
		disk: on('disk', () => disk(edge, name)),
		spec: on('spec', () => resourceRead(edge, 'node', name)),
		drift: on('drift', () => node<Drift>(edge, name, '/drift')),
	};
};
