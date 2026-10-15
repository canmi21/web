import { describe, expect, it } from 'vitest';
import { MOCKED, WRITES, mockedIn, writesIn } from './mode.ts';

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

describe('writes to control', () => {
	it('are always sent from a build, and from development only where stated', () => {
		expect(writesIn(false, undefined)).toBe(true);
		expect(writesIn(true, true)).toBe(true);
		expect(writesIn(true, undefined)).toBe(false);
		expect(writesIn(true, '1')).toBe(false);
	});

	it('are held under test, where nothing states them', () => {
		expect(WRITES).toBe(false);
	});
});
