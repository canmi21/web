/**
 * canmi.app's router: a path goes to the part named by its first segment, through that part's
 * binding; what belongs to the name rather than to a part is answered here. See
 * spec/architecture/space.md.
 */
import { Hono } from 'hono';
import { pickUrls } from '@monoflake/sdk';
import { followSymlink, symlinkOf } from '@monoflake/sdk/symlink';
import { PARTS, reached, type Binding } from './parts.ts';

type Env = {
	Bindings: Record<Binding, Fetcher> & {
		/** Set by the development script alone, so addresses are development's. */
		DEV?: string;
	};
};

/** Space's marks, as `data/record/symlinks.json` registers them under `space`. */
const MARKS = new Set(['favicon.ico', 'favicon.svg']);

const app = new Hono<Env>();

// Nothing stands at the root yet, so the name sends a reader to the site, saying where from.
app.get('/', (c) => {
	const site = new URL(pickUrls(c.env.DEV === '1').site);
	site.searchParams.set('ref', 'app');
	return c.redirect(site.href, 302);
});

// The names a browser asks the host for on its own, `/favicon.ico` above all, followed for it;
// see platform's spec/architecture/delivery.md, "A page follows the name for the browser".
app.get('/:mark', (c, next) => {
	const mark = c.req.param('mark');
	if (!MARKS.has(mark)) return next();
	return followSymlink(symlinkOf(pickUrls(c.env.DEV === '1').symlink, 'space', mark));
});

for (const [segment, part] of Object.entries(PARTS)) {
	const send = (c: { env: Env['Bindings']; req: { raw: Request } }) =>
		!reached(part, c.env.DEV === '1')
			? new Response('Not Found', { status: 404 })
			: c.env[part.binding].fetch(c.req.raw);
	app.all(`/${segment}`, send);
	app.all(`/${segment}/*`, send);
}

export default app;
