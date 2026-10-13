/**
 * The console's own API under `/api/`, a Hono app as the site's is: the facets, the live stream
 * and the commands, each at the address ../facets.ts asks it at, and whatever the console answers
 * itself after them. See spec/architecture/console.md, "A component asks for its facet".
 */
import { routeOf } from '@canmi/addresses';
import { failure, success } from '@canmi/response';
import { poweredBy } from '@canmi/web/disclose/hono';
import { Hono } from 'hono';
import { getCookie } from 'hono/cookie';
import { ASKED, PREFIX } from '../facets.ts';
import { served } from '../ui/time-zone.ts';
import type { Env } from './edge.ts';
import type { Edge } from './read.ts';
import { accessOf, identityOf } from './access.ts';
import { COMMANDS, type CommandName, crossSite } from './commands.ts';
import { FACETS, type FacetName, STREAMS, type StreamName } from './facets.ts';
import type { Whereabouts } from './nodes.ts';
import { sourcesOf } from './sources.ts';
import { dev } from '$app/env';
import { asksFresh, storeOf } from './cache.ts';
import { MOCKED } from './mode.ts';

const app = new Hono<{ Bindings: Env }>();

// First, so every answer says what made it. See lib's spec/web/disclose.md.
app.use(poweredBy());

app.get(`${PREFIX}*`, async (c) => {
	const asked = routeOf(ASKED, c.req.path.slice(PREFIX.length));
	if (!asked) return failure(404, 'no_such_route');
	if (asked.route in STREAMS) return STREAMS[asked.route as StreamName].open(c.req.raw, c.env);
	if (!(asked.route in FACETS)) return failure(404, 'no_such_route');
	const facet = FACETS[asked.route as FacetName];
	const params = facet.params({ ...c.req.query(), ...asked.query });
	if (!params) return failure(400, 'invalid_route');
	const context = {
		sources: sourcesOf(c.req.raw, edgeOf(c.req.raw, c.env)),
		zone: served(
			{ get: (name) => getCookie(c, name) },
			c.req.raw.cf as { timezone?: string } | undefined,
		),
		now: Date.now(),
	};
	// Each facet's own parameters, checked by its `params` just above.
	return success(await facet.read(context, params as never));
});

/**
 * A command: the request held to the console's own pages before anything else is read, its body
 * checked, its sender's Access identity verified, and its outcome answered whole, a refusal
 * included, as a facet answers a failed read.
 */
app.post(`${PREFIX}*`, async (c) => {
	const asked = routeOf(ASKED, c.req.path.slice(PREFIX.length));
	if (!asked || !(asked.route in COMMANDS)) return failure(404, 'no_such_route');
	const crossed = crossSite(c.req.raw);
	if (crossed) return crossed;
	const command = COMMANDS[asked.route as CommandName];
	const body = command.body(await c.req.json().catch(() => undefined));
	if (!body) return failure(400, 'invalid_body');
	// Mock mode writes to made-up data as whoever runs it; see ./mode.ts.
	const by = MOCKED ? 'developer' : await identityOf(c.req.raw, accessOf(c.env));
	if (!by) return failure(401, 'invalid_token', { message: 'Access did not sign this request.' });
	// Each command's own body, checked by its `body` just above.
	return success(await command.run(edgeOf(c.req.raw, c.env), by, body as never));
});

/** What a request reads with: the Worker's bindings, where the reader is, and the edge's cache. */
function edgeOf(request: Request, env: Env): Edge {
	return {
		env,
		where: request.cf as Whereabouts | undefined,
		store: storeOf(dev, new URL(request.url).origin),
		fresh: asksFresh(request),
		mock: MOCKED,
	};
}

app.all('*', () => failure(404, 'no_such_route'));

export default app;
