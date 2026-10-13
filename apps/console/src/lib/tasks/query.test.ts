import { describe, expect, it } from 'vitest';
import { LIMIT, taskHref, taskQueryOf } from './query.ts';

describe('the Tasks page’s query', () => {
	it('takes what narrows the list and leaves out what is blank', () => {
		const query = new URLSearchParams('service=registry&state=&kind=%20write%20&before=c1&other=x');
		expect(taskQueryOf(query)).toEqual({
			service: 'registry',
			kind: 'write',
			before: 'c1',
			limit: String(LIMIT),
		});
	});

	it('writes a page’s link without the limit, and the newest page as a bare query', () => {
		expect(taskHref({ service: 'registry', before: 'c1', limit: '50' })).toBe(
			'?service=registry&before=c1',
		);
		expect(taskHref({ limit: '50' })).toBe('?');
	});
});
