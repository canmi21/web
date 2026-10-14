import { waitUntil } from 'cloudflare:workers';
import { learned } from '#lib/server/control.js';
import { order, type Whereabouts } from '#lib/server/nodes.js';
import { edgeOf } from '#lib/server/platform.js';
import { served } from '#lib/ui/time-zone.js';
import type { LayoutServerLoad } from './$types';

/**
 * The reader's zone, from their cookie or Cloudflare's guess -- see src/lib/ui/time-zone.ts -- the
 * facts the console shows of other repositories, which the browser takes in as the server did, and
 * the node nearest the reader, from where Cloudflare says they are, so the first paint names the
 * relay the socket goes to first. See RFC 17b3o.
 */
export const load: LayoutServerLoad = async (event) => {
	const facts = await learned(edgeOf(event), waitUntil);
	return {
		zone: served(event.cookies, event.request.cf as { timezone?: string } | undefined),
		nearest: order(event.request.cf as Whereabouts | undefined)[0],
		facts,
	};
};
