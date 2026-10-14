import { describe, expect, it } from 'vitest';
import { Events } from './sse.ts';

describe('an event stream', () => {
	it('gives each event once its blank line comes, however the text was cut', () => {
		const events = new Events();
		expect(events.take('data: {"type":"clu')).toEqual([]);
		expect(events.take('ster"}\n')).toEqual([]);
		expect(events.take('\ndata: {"type":"beat"}\n\n: ping\n\n')).toEqual([
			'{"type":"cluster"}',
			'{"type":"beat"}',
		]);
	});

	it('passes over comments and fields but data, and joins lines of one event', () => {
		const events = new Events();
		expect(events.take(': ping\r\n\r\nevent: x\nid: 4\ndata: a\ndata: b\n\n')).toEqual(['a\nb']);
	});
});
