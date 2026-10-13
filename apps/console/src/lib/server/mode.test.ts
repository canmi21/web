import { describe, expect, it } from 'vitest';
import { MOCKED, mockedIn } from './mode.ts';

describe('mock mode', () => {
	it('is on in development alone, so a production build never writes as its made-up writer', () => {
		expect(mockedIn(true, true)).toBe(true);
		expect(mockedIn(false, true)).toBe(false);
		expect(mockedIn(true, undefined)).toBe(false);
		expect(mockedIn(true, 'true')).toBe(false);
	});

	it('is off under test, where nothing states it', () => {
		expect(MOCKED).toBe(false);
	});
});
