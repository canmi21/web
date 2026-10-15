/**
 * A contract's TypeScript reader, generated from the JSON Schema its producer writes from its own
 * type: the types, and beside each a valibot schema held to it by the compiler. It covers the part
 * of JSON Schema the producers write and refuses the rest, naming where. `--check` writes nothing
 * and fails where a committed reader differs from what its schema makes now; a producer not cloned
 * beside this checkout is passed over, named. Another repository's reader is made by naming it,
 * `--schema <path> --reader <path> --again "<command>"`, paths from where it is run and the
 * command its header says writes it again. See the workspace's spec/json.md, "A contract across
 * languages is the producer's type, and every other reader is derived from it", and RFC bq3vn.
 */
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { beside } from './beside.ts';

/** The web repository, which every path below is relative to. */
const ROOT = fileURLToPath(new URL('../../../', import.meta.url));

export interface Contract {
	/**
	 * The producer's committed schema, in its own checkout beside this one, the directory it may
	 * move its app between written `*`; see beside.ts.
	 */
	schema: string;
	/** The reader made of it, committed here. */
	reader: string;
}

export const CONTRACTS: readonly Contract[] = [
	{
		schema: '../platform/apps/*/control/catalog.schema.json',
		reader: 'apps/console/src/lib/control/catalog.gen.ts',
	},
];

type Schema = boolean | { readonly [keyword: string]: unknown };

/** A schema written in what the generator does not cover, at its JSON pointer. */
export class Unsupported extends Error {
	constructor(pointer: string, what: string) {
		super(`${pointer || '/'}: ${what}`);
	}
}

/** A schema as TypeScript reads it: its type, and the valibot schema that checks a value is one. */
interface Made {
	type: string;
	schema: string;
	/** What a union's members say of themselves, which a doc comment cannot sit on. */
	notes?: string[];
}

const IDENTIFIER = /^[A-Za-z_$][A-Za-z0-9_$]*$/;
// Past 2^53 a JSON number is not exact in JavaScript whatever reads it, so 64 bits are read as any
// number is.
const INTEGER_FORMATS = new Set(
	['', '8', '16', '32', '64'].flatMap((bits) => [`int${bits}`, `uint${bits}`]),
);
const NUMBER_FORMATS = new Set(['float', 'double']);
const ANNOTATIONS = ['description', 'title'];

/** `text` and `notes` as a doc comment, or nothing where there is no text. */
function doc(text: unknown, notes: readonly string[] = []): string {
	const said = [typeof text === 'string' ? text.trim() : '', ...notes].filter(Boolean);
	if (said.length === 0) return '';
	const lines = said.join('\n\n').replaceAll('*/', '*\\/').split('\n');
	return `/**\n${lines.map((line) => ` * ${line}`.trimEnd()).join('\n')}\n */\n`;
}

const keyOf = (name: string) => (IDENTIFIER.test(name) ? name : JSON.stringify(name));
const listOf = (type: string) => (/[|&]/.test(type) ? `(${type})[]` : `${type}[]`);

class Generator {
	readonly #defs: Readonly<Record<string, Schema>>;

	constructor(defs: Readonly<Record<string, Schema>>) {
		this.#defs = defs;
	}

	/** The keywords of `schema` past `allowed`, refused. */
	#only(schema: Record<string, unknown>, pointer: string, allowed: readonly string[]): void {
		const extra = Object.keys(schema).filter((key) => ![...ANNOTATIONS, ...allowed].includes(key));
		if (extra.length > 0) throw new Unsupported(pointer, `does not cover ${extra.join(', ')}`);
	}

	made(schema: Schema, pointer: string): Made {
		if (schema === true) return { type: 'unknown', schema: 'v.unknown()' };
		if (schema === false) return { type: 'never', schema: 'v.never()' };
		if (typeof schema !== 'object' || schema === null || Array.isArray(schema)) {
			throw new Unsupported(pointer, 'is not a schema');
		}
		if ('$ref' in schema) return this.#reference(schema, pointer);
		if ('not' in schema) return this.#never(schema, pointer);
		if ('enum' in schema || 'const' in schema) return this.#literals(schema, pointer);
		if ('oneOf' in schema) return this.#oneOf(schema, pointer);
		if ('anyOf' in schema) return this.#anyOf(schema, pointer);
		if (!('type' in schema)) {
			this.#only(schema, pointer, []);
			return { type: 'unknown', schema: 'v.unknown()' };
		}
		switch (schema.type) {
			case 'object':
				return this.#object(schema, pointer);
			case 'array':
				return this.#array(schema, pointer);
			case 'string':
				this.#only(schema, pointer, ['type']);
				return { type: 'string', schema: 'v.string()' };
			case 'boolean':
				this.#only(schema, pointer, ['type']);
				return { type: 'boolean', schema: 'v.boolean()' };
			case 'integer':
				return this.#number(schema, pointer, INTEGER_FORMATS, ['v.integer()']);
			case 'number':
				return this.#number(schema, pointer, NUMBER_FORMATS, []);
			default:
				throw new Unsupported(pointer, `does not cover the type ${JSON.stringify(schema.type)}`);
		}
	}

	#reference(schema: Record<string, unknown>, pointer: string): Made {
		this.#only(schema, pointer, ['$ref']);
		const name = typeof schema.$ref === 'string' ? schema.$ref.replace(/^#\/\$defs\//, '') : '';
		if (name === schema.$ref || !Object.hasOwn(this.#defs, name)) {
			throw new Unsupported(pointer, `refers outside $defs: ${JSON.stringify(schema.$ref)}`);
		}
		// Lazy, so a definition may name itself or one declared after it.
		return { type: name, schema: `v.lazy(() => ${name})` };
	}

	#never(schema: Record<string, unknown>, pointer: string): Made {
		this.#only(schema, pointer, ['not']);
		const not = schema.not;
		const everything =
			not === true || (typeof not === 'object' && not !== null && Object.keys(not).length === 0);
		if (!everything) throw new Unsupported(pointer, 'covers `not` only as `{}`, which is never');
		return { type: 'never', schema: 'v.never()' };
	}

	/** The values an `enum` or a `const` allows, each a string or a number. */
	#values(schema: Record<string, unknown>, pointer: string): (string | number)[] {
		this.#only(schema, pointer, ['enum', 'const', 'type']);
		const values = 'const' in schema ? [schema.const] : schema.enum;
		if (!Array.isArray(values) || values.length === 0) {
			throw new Unsupported(pointer, 'has an `enum` that lists nothing');
		}
		for (const value of values) {
			if (typeof value !== 'string' && typeof value !== 'number') {
				throw new Unsupported(
					pointer,
					`covers strings and numbers alone, not ${JSON.stringify(value)}`,
				);
			}
			const type = schema.type === 'integer' ? 'number' : schema.type;
			if (type !== undefined && type !== typeof value) {
				throw new Unsupported(pointer, `holds ${JSON.stringify(value)}, not a ${schema.type}`);
			}
		}
		return values as (string | number)[];
	}

	#literals(schema: Record<string, unknown>, pointer: string): Made {
		const values = this.#values(schema, pointer).map((value) => JSON.stringify(value));
		return {
			type: values.join(' | '),
			schema:
				values.length === 1 ? `v.literal(${values[0]})` : `v.picklist([${values.join(', ')}])`,
		};
	}

	/**
	 * `oneOf` where every branch is a set of values and no value is in two: exactly one then matches
	 * whenever any does, so it is a union. A `oneOf` of overlapping branches is not, and is refused.
	 */
	#oneOf(schema: Record<string, unknown>, pointer: string): Made {
		this.#only(schema, pointer, ['oneOf']);
		const branches = schema.oneOf;
		if (!Array.isArray(branches) || branches.length === 0) {
			throw new Unsupported(pointer, 'has a `oneOf` that lists nothing');
		}
		const seen = new Set<string | number>();
		const made = branches.map((branch: Schema, index) => {
			const at = `${pointer}/oneOf/${index}`;
			if (typeof branch !== 'object' || !('enum' in branch || 'const' in branch)) {
				throw new Unsupported(at, 'covers a `oneOf` of values alone');
			}
			for (const value of this.#values(branch, at)) {
				if (seen.has(value)) throw new Unsupported(at, `holds ${JSON.stringify(value)} twice`);
				seen.add(value);
			}
			const said = typeof branch.description === 'string' ? branch.description : '';
			const literals = this.#literals(branch, at);
			return { ...literals, note: said && `${literals.type.replaceAll('"', '`')}: ${said}` };
		});
		return {
			type: made.map((one) => one.type).join(' | '),
			schema: `v.union([${made.map((one) => one.schema).join(', ')}])`,
			notes: made.map((one) => one.note).filter(Boolean),
		};
	}

	#anyOf(schema: Record<string, unknown>, pointer: string): Made {
		this.#only(schema, pointer, ['anyOf']);
		const branches = schema.anyOf;
		if (!Array.isArray(branches) || branches.length === 0) {
			throw new Unsupported(pointer, 'has an `anyOf` that lists nothing');
		}
		const made = branches.map((branch: Schema, index) =>
			this.made(branch, `${pointer}/anyOf/${index}`),
		);
		return {
			type: made.map((one) => one.type).join(' | '),
			schema: `v.union([${made.map((one) => one.schema).join(', ')}])`,
		};
	}

	#number(
		schema: Record<string, unknown>,
		pointer: string,
		formats: ReadonlySet<string>,
		checks: string[],
	): Made {
		this.#only(schema, pointer, ['type', 'format', 'minimum', 'maximum']);
		if (schema.format !== undefined && !formats.has(String(schema.format))) {
			throw new Unsupported(pointer, `does not cover the format ${JSON.stringify(schema.format)}`);
		}
		const bounds = (['minimum', 'maximum'] as const).flatMap((bound) => {
			const value = schema[bound];
			if (value === undefined) return [];
			if (typeof value !== 'number') throw new Unsupported(pointer, `has a ${bound} not a number`);
			return [`v.${bound === 'minimum' ? 'minValue' : 'maxValue'}(${value})`];
		});
		const all = [...checks, ...bounds];
		return {
			type: 'number',
			schema: all.length === 0 ? 'v.number()' : `v.pipe(v.number(), ${all.join(', ')})`,
		};
	}

	#array(schema: Record<string, unknown>, pointer: string): Made {
		this.#only(schema, pointer, ['type', 'items']);
		if (typeof schema.items !== 'object' && typeof schema.items !== 'boolean') {
			throw new Unsupported(pointer, 'covers an array only with one `items` schema');
		}
		if (Array.isArray(schema.items)) throw new Unsupported(pointer, 'does not cover a tuple');
		const items = this.made(schema.items as Schema, `${pointer}/items`);
		return { type: listOf(items.type), schema: `v.array(${items.schema})` };
	}

	/**
	 * An object of named keys, those `required` lists present and the rest absent when unset, never
	 * null; unknown keys are passed over unless `additionalProperties` is false. With no keys named,
	 * a map of `additionalProperties`.
	 */
	#object(schema: Record<string, unknown>, pointer: string): Made {
		this.#only(schema, pointer, ['type', 'properties', 'required', 'additionalProperties']);
		const { properties, additionalProperties: rest } = schema;
		const required = schema.required ?? [];
		if (!Array.isArray(required) || required.some((name) => typeof name !== 'string')) {
			throw new Unsupported(pointer, 'has a `required` that is not a list of names');
		}
		if (properties === undefined) {
			if (required.length > 0) throw new Unsupported(pointer, 'requires keys it does not name');
			const values = this.made((rest ?? true) as Schema, `${pointer}/additionalProperties`);
			return {
				type: `{ [key: string]: ${values.type} }`,
				schema: `v.record(v.string(), ${values.schema})`,
			};
		}
		if (typeof properties !== 'object' || properties === null || Array.isArray(properties)) {
			throw new Unsupported(pointer, 'has `properties` that are not an object');
		}
		if (rest !== undefined && rest !== false && rest !== true) {
			throw new Unsupported(pointer, 'does not cover named keys beside a map of others');
		}
		const missing = required.filter((name) => !Object.hasOwn(properties, name));
		if (missing.length > 0)
			throw new Unsupported(pointer, `requires ${missing.join(', ')}, unnamed`);
		const fields = Object.entries(properties as Record<string, Schema>).map(([name, field]) => {
			const made = this.made(field, `${pointer}/properties/${name}`);
			const optional = !required.includes(name);
			const note = doc(typeof field === 'object' ? field.description : '', made.notes);
			return {
				type: `${note}${keyOf(name)}${optional ? '?' : ''}: ${made.type};`,
				schema: `${keyOf(name)}: ${optional ? `v.exactOptional(${made.schema})` : made.schema},`,
			};
		});
		const strict = rest === false ? 'strictObject' : 'object';
		return {
			type: `{\n${fields.map((one) => one.type).join('\n')}\n}`,
			schema: `v.${strict}({\n${fields.map((one) => one.schema).join('\n')}\n})`,
		};
	}
}

/** One exported type and its schema, named alike, the schema held to the type by the compiler. */
function declared(name: string, schema: Schema, made: Made): string {
	const note = doc(typeof schema === 'object' ? schema.description : '', made.notes);
	return [
		`${note}export type ${name} = ${made.type};`,
		`export const ${name}: v.GenericSchema<${name}> = ${made.schema};`,
	].join('\n');
}

/**
 * The reader of `root`, unformatted: each of its `$defs`, then the root itself, named by its
 * `title`. `source` is where the header says it was made from, and `again` the command it says
 * writes it again, this repository's own when none is given.
 */
export function generate(root: Schema, source: string, again?: string): string {
	if (typeof root !== 'object') throw new Unsupported('', 'is a boolean, not a named type');
	const { $schema: _dialect, $defs = {}, ...rest } = root;
	if (typeof root.title !== 'string' || !IDENTIFIER.test(root.title)) {
		throw new Unsupported('', 'has no `title` to name its type by');
	}
	if (typeof $defs !== 'object' || $defs === null || Array.isArray($defs)) {
		throw new Unsupported('/$defs', 'is not an object');
	}
	const defs = $defs as Record<string, Schema>;
	const generator = new Generator(defs);
	const names = Object.keys(defs);
	const clash = names.find((name) => !IDENTIFIER.test(name) || name === root.title || name === 'v');
	if (clash !== undefined) throw new Unsupported(`/$defs/${clash}`, 'cannot name a type');
	const declarations = [
		...names.map((name) => {
			const schema = defs[name] as Schema;
			return declared(name, schema, generator.made(schema, `/$defs/${name}`));
		}),
		declared(root.title, root, generator.made(rest, '')),
	];
	return [
		again === undefined
			? '// @generated by apps/console/scripts/contracts.ts, never edited by hand, from'
			: "// @generated by web's apps/console/scripts/contracts.ts, never edited by hand, from",
		`// ${source}.`,
		`// \`${again ?? 'mise run contracts'}\` writes it again, and \`verify\` fails where it differs; see the`,
		"// workspace's spec/json.md.",
		"import * as v from 'valibot';",
		'',
		declarations.join('\n\n'),
		'',
	].join('\n');
}

/** `text` as the formatter leaves a file at `path`, so `mise run fmt` never changes a reader. */
export function formatted(text: string, path: string): string {
	const oxfmt = join(ROOT, 'node_modules/.bin/oxfmt');
	const run = spawnSync(oxfmt, [`--stdin-filepath=${path}`], { cwd: ROOT, input: text });
	if (run.status !== 0) throw new Error(`oxfmt refused ${path}: ${run.stderr.toString()}`);
	return run.stdout.toString();
}

/** What `contract`'s reader is now, or undefined where its producer is not cloned beside this. */
export function readerOf(contract: Contract): string | undefined {
	const schema = beside(contract.schema, ROOT);
	if (schema === undefined || !existsSync(schema)) return undefined;
	const made = generate(JSON.parse(readFileSync(schema, 'utf8')) as Schema, contract.schema);
	return formatted(made, contract.reader);
}

/**
 * The one reader named on the command line, paths from the working directory, written or, with
 * `check`, compared. Its schema is the caller's own, so one that is not there is a failure.
 */
export function named(schema: string, reader: string, again: string, check: boolean): number {
	const root = JSON.parse(readFileSync(resolve(schema), 'utf8')) as Schema;
	const made = formatted(generate(root, schema, again), resolve(reader));
	if (!check) {
		writeFileSync(resolve(reader), made);
		console.log(`contracts: wrote ${reader}`);
		return 0;
	}
	if (existsSync(resolve(reader)) && readFileSync(resolve(reader), 'utf8') === made) return 0;
	console.error(`contracts: ${reader} differs from ${schema}; \`${again}\` writes it again`);
	return 1;
}

function main(check: boolean): number {
	let failed = 0;
	for (const contract of CONTRACTS) {
		const reader = readerOf(contract);
		const path = join(ROOT, contract.reader);
		if (reader === undefined) {
			console.warn(`contracts: ${contract.schema} is not here; ${contract.reader} not checked`);
		} else if (!check) {
			writeFileSync(path, reader);
			console.log(`contracts: wrote ${contract.reader}`);
		} else if (!existsSync(path) || readFileSync(path, 'utf8') !== reader) {
			console.error(`contracts: ${contract.reader} differs from ${contract.schema}`);
			failed += 1;
		}
	}
	if (failed > 0) console.error('contracts: `mise run contracts` writes them again');
	return failed > 0 ? 1 : 0;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
	const { values } = parseArgs({
		options: {
			check: { type: 'boolean' },
			schema: { type: 'string' },
			reader: { type: 'string' },
			again: { type: 'string' },
		},
		strict: true,
	});
	const { check = false, schema, reader, again } = values;
	if (schema === undefined && reader === undefined && again === undefined) {
		process.exit(main(check));
	}
	if (schema === undefined || reader === undefined || again === undefined) {
		console.error('contracts: --schema, --reader and --again are named together');
		process.exit(2);
	}
	process.exit(named(schema, reader, again, check));
}
