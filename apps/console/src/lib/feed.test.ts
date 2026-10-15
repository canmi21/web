import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./facets.ts', () => ({
	ask: vi.fn(async () => undefined),
	streamAddress: () => new URL('https://console.example.test/api/live'),
	streamUrl: () => new URL('wss://console.example.test/api/live'),
}));

const { ask } = await import('./facets.ts');
const { HIDDEN_MS, listen } = await import('./feed.ts');

/** A page whose visibility a test turns, as a browser does on a change of tab. */
class Page extends EventTarget {
	visibilityState: 'visible' | 'hidden' = 'visible';

	turn(state: 'visible' | 'hidden') {
		this.visibilityState = state;
		this.dispatchEvent(new Event('visibilitychange'));
	}
}

/** Each stream asked for, which holds on until its request is aborted. */
let streams: AbortSignal[];
let page: Page;
const modes: string[] = [];

/** The relay's stream: the cluster first, then nothing, open until aborted. */
function holding(_url: unknown, init: RequestInit = {}): Promise<Response> {
	const signal = init.signal as AbortSignal;
	streams.push(signal);
	const body = new ReadableStream<Uint8Array>({
		start(controller) {
			controller.enqueue(new TextEncoder().encode('data: {"type":"cluster"}\n\n'));
			signal.addEventListener('abort', () =>
				controller.error(new DOMException('Aborted', 'AbortError')),
			);
		},
	});
	return Promise.resolve(new Response(body, { headers: { 'content-type': 'text/event-stream' } }));
}

function listening() {
	return listen({
		live: () => true,
		polled: () => {},
		mode: (mode) => void modes.push(mode),
		failure: () => {},
	});
}

const open = () => streams.filter((signal) => !signal.aborted).length;

beforeEach(() => {
	vi.useFakeTimers();
	streams = [];
	modes.length = 0;
	page = new Page();
	vi.stubGlobal('document', page);
	vi.stubGlobal('fetch', vi.fn(holding));
	vi.mocked(ask).mockClear();
});

afterEach(() => {
	vi.useRealTimers();
	vi.unstubAllGlobals();
});

describe('the live stream, while the page is hidden', () => {
	it('closes once the page has been hidden for ten seconds, leaving nothing open', async () => {
		const stop = listening();
		await vi.advanceTimersByTimeAsync(0);
		expect([open(), modes.at(-1)]).toEqual([1, 'live']);
		page.turn('hidden');
		await vi.advanceTimersByTimeAsync(HIDDEN_MS - 1);
		expect(open()).toBe(1);
		await vi.advanceTimersByTimeAsync(1);
		expect([open(), modes.at(-1)]).toEqual([0, 'paused']);
		expect(vi.getTimerCount()).toBe(0);
		stop();
	});

	it('keeps its stream through a shorter hide', async () => {
		const stop = listening();
		await vi.advanceTimersByTimeAsync(0);
		page.turn('hidden');
		await vi.advanceTimersByTimeAsync(HIDDEN_MS / 2);
		page.turn('visible');
		await vi.advanceTimersByTimeAsync(HIDDEN_MS * 2);
		expect([streams.length, open(), modes.at(-1)]).toEqual([1, 1, 'live']);
		stop();
	});

	it('is dialed again at once when the page is shown', async () => {
		const stop = listening();
		await vi.advanceTimersByTimeAsync(0);
		page.turn('hidden');
		await vi.advanceTimersByTimeAsync(HIDDEN_MS);
		page.turn('visible');
		await vi.advanceTimersByTimeAsync(0);
		expect([streams.length, open()]).toEqual([2, 1]);
		expect(modes.slice(-2)).toEqual(['connecting', 'live']);
		stop();
	});

	it('is not cut for its silence while hidden', async () => {
		const stop = listening();
		await vi.advanceTimersByTimeAsync(0);
		// 25 s with no message, then 9 s hidden: past the 30 s watchdog, short of the pause.
		await vi.advanceTimersByTimeAsync(25_000);
		page.turn('hidden');
		await vi.advanceTimersByTimeAsync(HIDDEN_MS - 1_000);
		expect([streams.length, open(), modes.at(-1)]).toEqual([1, 1, 'live']);
		stop();
	});

	it('polls nothing, and redials nothing, once paused', async () => {
		vi.mocked(fetch).mockImplementation(() => Promise.reject(new TypeError('offline')));
		const stop = listening();
		await vi.advanceTimersByTimeAsync(0);
		expect(modes.at(-1)).toBe('polling');
		expect(ask).toHaveBeenCalled();
		page.turn('hidden');
		await vi.advanceTimersByTimeAsync(HIDDEN_MS);
		expect(modes.at(-1)).toBe('paused');
		vi.mocked(ask).mockClear();
		vi.mocked(fetch).mockClear();
		await vi.advanceTimersByTimeAsync(120_000);
		expect(ask).not.toHaveBeenCalled();
		expect(fetch).not.toHaveBeenCalled();
		stop();
	});
});

describe('the live stream, while the page is shown', () => {
	it('watches every node, by event stream and by socket alike', async () => {
		const dialed: string[] = [];
		vi.stubGlobal(
			'WebSocket',
			class {
				constructor(url: URL) {
					dialed.push(url.toString());
				}
				close() {}
			},
		);
		const stop = listening();
		await vi.advanceTimersByTimeAsync(0);
		// No relay answering with events: the socket, asked the same.
		vi.mocked(fetch).mockResolvedValueOnce(new Response(null, { status: 426 }));
		page.turn('hidden');
		await vi.advanceTimersByTimeAsync(HIDDEN_MS);
		page.turn('visible');
		await vi.advanceTimersByTimeAsync(0);
		const asked = vi.mocked(fetch).mock.calls.map(([url]) => String(url));
		for (const url of [...asked, ...dialed]) {
			const query = new URL(url).searchParams;
			expect([query.get('deltas'), query.get('watch')]).toEqual(['true', 'all']);
		}
		expect([asked.length, dialed.length]).toEqual([2, 1]);
		stop();
	});
});
