/**
 * A page's lease on a node's fine readings: asked once the page is up and every RENEW while it is
 * shown, of the relay its live stream is on, which then sends that node's second as it is read
 * until the lease lapses. A relay before the lease takes none, and the page draws the node's
 * newest minute instead. Made while a component starts, since it owns an effect. See platform's
 * spec/architecture/relay.md, RFC grmtb.
 */
import { pathOf } from '@canmi/addresses';
import { ASKED, PREFIX } from '../facets.ts';
import type { Node } from '../server/nodes.ts';

/** Half the relay's lease of sixty seconds, so one missed renewal does not let it lapse. */
const RENEW = 30_000;

async function asked(node: Node, via: Node | undefined): Promise<void> {
	try {
		await fetch(pathOf(ASKED, PREFIX, 'watch'), {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify(via === undefined ? { node } : { node, via }),
		});
	} catch {
		// The next renewal asks again.
	}
}

export class Watch {
	constructor(of: () => { node: Node; via: Node | undefined }) {
		$effect(() => {
			const { node, via } = of();
			const renew = () => {
				if (!document.hidden) void asked(node, via);
			};
			renew();
			const timer = setInterval(renew, RENEW);
			document.addEventListener('visibilitychange', renew);
			return () => {
				clearInterval(timer);
				document.removeEventListener('visibilitychange', renew);
			};
		});
	}
}
