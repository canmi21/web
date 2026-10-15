/**
 * The one `live` stream, read as events as it arrives, or by a socket where no relay answers with
 * events yet, and the `cluster` facet asked every few seconds while it is down, all under the
 * page's own `/api/`: ./server/api.ts answers them. Nothing is open while the page has been hidden
 * for `HIDDEN_MS`, and showing it again dials at once, the relay's first message the cluster whole.
 * See platform's spec/architecture/relay.md, "A browser opens `/live`", and RFC grmtb.
 */
import { ask, streamAddress, streamUrl } from './facets.ts';
import { Events } from './sse.ts';
import type { Cluster, Live } from './wire.ts';

/** Which of the two is in use, or neither while the page is hidden. */
export type Mode = 'connecting' | 'live' | 'polling' | 'paused';

export interface Listener {
	/** Takes a message; false where the stream must be opened again, whole. */
	live(message: Live): boolean;
	polled(cluster: Cluster): void;
	mode(mode: Mode): void;
	/** Why the last poll failed, or undefined once one succeeds. */
	failure(why: string | undefined): void;
}

const POLL_MS = 5_000;
/** Redialed from one second, doubling to a minute, as the relays redial each other. */
const FIRST_RETRY_MS = 1_000;
const LAST_RETRY_MS = 60_000;
/**
 * A browser answers the relay's pings on its own and cannot send any, so the page watches instead:
 * every node moves every few seconds, and this long with no message means the socket is dead.
 */
const SILENCE_MS = 30_000;
/** How long the page is hidden before nothing is kept open; a glance at another tab keeps it. */
export const HIDDEN_MS = 10_000;

/** Whether the page is out of sight; a page with no document, as under test, never is. */
const hidden = () => typeof document !== 'undefined' && document.visibilityState === 'hidden';

/** Starts listening; the returned function stops. */
export function listen(listener: Listener): () => void {
	const socketUrl = streamUrl('live');
	const address = streamAddress('live');
	// Each node's changes rather than its entry whole, after the cluster; platform's RFC grmtb.
	socketUrl.searchParams.set('deltas', 'true');
	address.searchParams.set('deltas', 'true');

	let socket: WebSocket | undefined;
	/** The event stream being read, which aborting ends. */
	let reading: AbortController | undefined;
	/** Until no relay answers with events: then the socket, for the rest of the page's life. */
	let streaming = true;
	let retry = FIRST_RETRY_MS;
	let redial: ReturnType<typeof setTimeout> | undefined;
	let silence: ReturnType<typeof setTimeout> | undefined;
	let poll: ReturnType<typeof setInterval> | undefined;
	let hiding: ReturnType<typeof setTimeout> | undefined;
	/** Whether the stream or socket is open, so the watchdog has something to watch. */
	let open = false;
	let paused = false;
	let stopped = false;

	function dial() {
		listener.mode(poll ? 'polling' : 'connecting');
		if (streaming) void stream();
		else connect();
	}

	/** Open: polling stops, and the next redial waits the least again. */
	function opened() {
		retry = FIRST_RETRY_MS;
		open = true;
		stopPolling();
		listener.mode('live');
		watch();
	}

	/** Lost, by `which` and not by stopping: polled until it is opened again, later each time. */
	function lost(which: unknown, current: unknown) {
		if (which !== current || stopped || paused) return;
		open = false;
		clearTimeout(silence);
		startPolling();
		redial = setTimeout(dial, retry);
		retry = Math.min(retry * 2, LAST_RETRY_MS);
	}

	/** Each message taken; false where the stream must be opened again, whole. */
	function took(data: string): boolean {
		try {
			return listener.live(JSON.parse(data) as Live);
		} catch {
			// Not JSON: nothing a relay sends, so nothing to read.
			return true;
		}
	}

	async function stream() {
		const controller = new AbortController();
		reading = controller;
		const headers = { accept: 'text/event-stream' };
		const answer = await fetch(address, { headers, signal: controller.signal }).catch(
			() => undefined,
		);
		if (reading !== controller) return;
		const kind = answer?.headers.get('content-type') ?? '';
		if (answer && (!answer.ok || !kind.startsWith('text/event-stream') || !answer.body)) {
			// No relay answered with events: the socket, as before them.
			await answer.body?.cancel();
			if (reading !== controller) return;
			streaming = false;
			reading = undefined;
			connect();
			return;
		}
		if (answer?.body) {
			opened();
			const text = answer.body.pipeThrough(new TextDecoderStream()).getReader();
			const events = new Events();
			try {
				for (let next = await text.read(); !next.done; next = await text.read()) {
					watch();
					if (!events.take(next.value).every(took)) {
						retry = FIRST_RETRY_MS;
						break;
					}
				}
			} catch {
				// Aborted for its silence or by stopping, or broken off: lost alike.
			}
			controller.abort();
		}
		const current = reading;
		if (current === controller) reading = undefined;
		lost(controller, current);
	}

	function connect() {
		const dialed = new WebSocket(socketUrl);
		socket = dialed;
		dialed.onopen = opened;
		dialed.onmessage = (message) => {
			watch();
			if (typeof message.data !== 'string') return;
			if (!took(message.data)) {
				retry = FIRST_RETRY_MS;
				dialed.close();
			}
		};
		dialed.onclose = () => {
			const current = socket;
			if (current === dialed) socket = undefined;
			lost(dialed, current);
		};
	}

	/** The silence watchdog, armed again by each message; never while hidden, when timers lag. */
	function watch() {
		clearTimeout(silence);
		if (hidden()) return;
		silence = setTimeout(() => {
			socket?.close();
			reading?.abort();
		}, SILENCE_MS);
	}

	function startPolling() {
		listener.mode('polling');
		if (poll) return;
		void askCluster();
		poll = setInterval(() => void askCluster(), POLL_MS);
	}

	function stopPolling() {
		clearInterval(poll);
		poll = undefined;
		listener.failure(undefined);
	}

	async function askCluster() {
		const read = await ask('cluster', {});
		if (!poll) return;
		if (read === undefined) listener.failure('no relay answered');
		else if (read.ok) {
			listener.polled(read.data);
			listener.failure(undefined);
		} else listener.failure(read.failure.message);
	}

	/** Everything closed and nothing polled, as the page has been hidden a while. */
	function pause() {
		paused = true;
		open = false;
		clearTimeout(redial);
		clearTimeout(silence);
		stopPolling();
		const closing = socket;
		socket = undefined;
		closing?.close();
		reading?.abort();
		reading = undefined;
		listener.mode('paused');
	}

	/** The page shown or hidden: paused once hidden `HIDDEN_MS`, and dialed at once on showing. */
	function seen() {
		if (hidden()) {
			clearTimeout(silence);
			hiding ??= setTimeout(pause, HIDDEN_MS);
			return;
		}
		clearTimeout(hiding);
		hiding = undefined;
		if (paused) {
			paused = false;
			retry = FIRST_RETRY_MS;
			dial();
		} else if (open) watch();
	}

	if (typeof document !== 'undefined') document.addEventListener('visibilitychange', seen);
	dial();
	if (hidden()) seen();
	return () => {
		stopped = true;
		if (typeof document !== 'undefined') document.removeEventListener('visibilitychange', seen);
		clearTimeout(hiding);
		clearTimeout(redial);
		clearTimeout(silence);
		clearInterval(poll);
		socket?.close();
		reading?.abort();
	};
}
