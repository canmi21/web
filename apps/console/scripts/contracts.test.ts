import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { CONTRACTS, Unsupported, formatted, generate, readerOf } from './contracts.ts';

const ROOT = fileURLToPath(new URL('../../../', import.meta.url));

/** `schema`'s reader as committed, formatted, named `Root`. */
const made = (schema: unknown) =>
	formatted(generate({ title: 'Root', ...(schema as object) }, 'a test'), 'apps/console/root.ts');

describe('a contract reader', () => {
	it('is generated again exactly as committed, wherever its producer is cloned beside this', () => {
		for (const contract of CONTRACTS) {
			const reader = readerOf(contract);
			if (reader === undefined) {
				console.warn(`${contract.schema} is not cloned beside web; its reader is not compared`);
				continue;
			}
			expect(reader).toBe(readFileSync(`${ROOT}${contract.reader}`, 'utf8'));
		}
	});

	it('names each definition twice, a type and the valibot schema held to it', () => {
		const text = made({
			$defs: { Kind: { type: 'string', enum: ['a', 'b'] } },
			$ref: '#/$defs/Kind',
		});
		expect(text).toContain("export type Kind = 'a' | 'b';");
		expect(text).toContain("export const Kind: v.GenericSchema<Kind> = v.picklist(['a', 'b']);");
		expect(text).toContain('export const Root: v.GenericSchema<Root> = v.lazy(() => Kind);');
		expect(text.split('\n')[0]).toContain('@generated');
	});

	it('keeps an optional key absent rather than null, and an unknown one only where allowed', () => {
		const object = {
			type: 'object',
			properties: { name: { type: 'string' }, note: { type: 'string', description: 'Said.' } },
			required: ['name'],
		};
		const loose = made(object);
		expect(loose).toContain('note?: string;');
		expect(loose).toContain('note: v.exactOptional(v.string())');
		expect(loose).toContain('v.object({');
		expect(loose).toContain('/**\n\t * Said.\n\t */\n\tnote?');
		expect(made({ ...object, additionalProperties: false })).toContain('v.strictObject({');
	});

	it('reads integers with their bounds, and a map of values', () => {
		const text = made({
			type: 'object',
			properties: {
				count: { type: 'integer', format: 'uint64', minimum: 0 },
				labels: { type: 'object', additionalProperties: { type: 'string' } },
			},
			required: ['count', 'labels'],
		});
		expect(text).toContain('count: v.pipe(v.number(), v.integer(), v.minValue(0))');
		expect(text).toContain('labels: v.record(v.string(), v.string())');
	});

	it("turns a oneOf of values into a union, each value's note in the type's doc", () => {
		const text = made({
			oneOf: [
				{ type: 'string', enum: ['a', 'b'] },
				{ type: 'string', const: 'c', description: 'The third.' },
			],
		});
		expect(text).toContain("export type Root = 'a' | 'b' | 'c';");
		expect(text).toContain('`c`: The third.');
		expect(text).toContain("v.union([v.picklist(['a', 'b']), v.literal('c')])");
	});

	it.each([
		['a null', { type: 'null' }, '/: does not cover the type "null"'],
		['a type list', { type: ['string', 'null'] }, '/: does not cover the type'],
		['a string format', { type: 'string', format: 'date-time' }, '/: does not cover format'],
		['a pattern', { type: 'string', pattern: '^a' }, '/: does not cover pattern'],
		['a tuple', { type: 'array', items: [{ type: 'string' }] }, '/: does not cover a tuple'],
		['a reference outside', { $ref: 'other.json#/X' }, '/: refers outside $defs'],
		['a missing definition', { $ref: '#/$defs/Gone' }, '/: refers outside $defs'],
		['a not of something', { not: { type: 'string' } }, '/: covers `not` only'],
		[
			'overlapping branches',
			{ oneOf: [{ enum: ['a'] }, { enum: ['a', 'b'] }] },
			'/oneOf/1: holds "a" twice',
		],
		['a oneOf of objects', { oneOf: [{ type: 'object', properties: {} }] }, '/oneOf/0: covers'],
		[
			'a key required and unnamed',
			{ type: 'object', properties: {}, required: ['x'] },
			'requires x',
		],
		[
			'a deep refusal, named where',
			{ type: 'object', properties: { a: { type: 'array', items: { type: 'null' } } } },
			'/properties/a/items: does not cover the type "null"',
		],
	])('refuses %s, naming where', (_, schema, message) => {
		expect(() => made(schema)).toThrow(Unsupported);
		expect(() => made(schema)).toThrow(message);
	});

	it('refuses a schema with no title to name its type by', () => {
		expect(() => generate({ type: 'string' }, 'a test')).toThrow('has no `title`');
	});

	it('names every contract by a reader under the console and a schema beside this checkout', () => {
		for (const contract of CONTRACTS) {
			expect(contract.schema.startsWith('../')).toBe(true);
			expect(contract.reader).toMatch(/^apps\/console\/src\/lib\/.+\.gen\.ts$/);
			expect(existsSync(`${ROOT}${contract.reader}`)).toBe(true);
		}
	});
});
