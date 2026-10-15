/**
 * A resource's form, worked out from its kind in the catalog alone: how each field is drawn, what
 * its input is named, and how what was sent is read back into a `spec`. A field control alone
 * writes is shown and never sent; a `secret` one is a password field, never filled from what was
 * read, and left blank it keeps what is held; a `masked` one is a text field filled and sent like
 * any other, its content hidden until shown. Platform's RFC cpc2b and spec/console/navigation.md.
 */
import type { Field, Kind } from '../control/catalog.gen.ts';
import type { Spec } from '../control/types.ts';

/** How a field is drawn. */
export type Input =
	| 'shown'
	| 'text'
	| 'password'
	| 'masked'
	| 'number'
	| 'checkbox'
	| 'select'
	| 'reference'
	| 'references'
	| 'checkboxes'
	| 'items'
	| 'json';

export function inputOf(field: Field): Input {
	if (!field.editable) return 'shown';
	if (field.secret) return 'password';
	if (field.masked && field.type === 'string') return 'masked';
	switch (field.type) {
		case 'string':
			return 'text';
		case 'integer':
			return 'number';
		case 'boolean':
			return 'checkbox';
		case 'choice':
			return 'select';
		case 'reference':
			return 'reference';
		case 'list':
			if (field.fields?.length) return 'items';
			if (field.kind) return 'references';
			return field.choices?.length ? 'checkboxes' : 'json';
		case 'object':
			return 'json';
	}
}

/** One resource a reference may name: its id, sent, and its name, shown. */
export interface Choice {
	value: string;
	label: string;
}

/** The resources each kind a form refers to holds, which its pickers offer. */
export type Options = Partial<Record<Kind, Choice[]>>;

/** Every kind `fields` refers to, a list of references and items' fields included. */
export function referred(fields: readonly Field[]): Kind[] {
	const kinds = new Set<Kind>();
	for (const field of fields) {
		if (field.kind) kinds.add(field.kind);
		for (const kind of referred(field.fields ?? [])) kinds.add(kind);
	}
	return [...kinds];
}

/** The name a field's input is sent under: `spec.identities.0.kind`. */
export const nameOf = (prefix: string, field: Field): string => `${prefix}.${field.name}`;

/** What a form sends, as the server reads it. */
export type Sent = Pick<FormData, 'get' | 'getAll' | 'keys'>;

/** What `read` found, and the fields by name that it could not take. */
export interface Reading {
	spec: Spec;
	missing: string[];
	invalid: string[];
}

const text = (sent: Sent, name: string) => {
	const value = sent.get(name);
	return typeof value === 'string' ? value.trim() : '';
};

/** The indexes of the items sent under `name`, in order. */
function indexes(sent: Sent, name: string): number[] {
	const found = new Set<number>();
	const pattern = new RegExp(`^${name.replaceAll('.', '\\.')}\\.(\\d+)\\.`);
	for (const key of sent.keys()) {
		const index = pattern.exec(key)?.[1];
		if (index !== undefined) found.add(Number(index));
	}
	return [...found].toSorted((a, b) => a - b);
}

const INVALID = Symbol('invalid');

/** A field's text as its value, or `INVALID` where it is not one. */
function parsed(input: Input, field: Field, raw: string): unknown {
	if (input === 'number') return Number.isSafeInteger(Number(raw)) ? Number(raw) : INVALID;
	if (input === 'select') return field.choices?.includes(raw) ? raw : INVALID;
	if (input !== 'json') return raw;
	try {
		return JSON.parse(raw) as unknown;
	} catch {
		return INVALID;
	}
}

/**
 * The editable fields `sent` holds under `prefix`, each left out where it was left blank. A blank
 * secret is never missing when `creating` is false: blank keeps what is held.
 */
export function read(fields: readonly Field[], sent: Sent, prefix: string, creating: boolean) {
	const reading: Reading = { spec: {}, missing: [], invalid: [] };
	for (const field of fields) {
		const input = inputOf(field);
		const name = nameOf(prefix, field);
		let value: unknown;
		if (input === 'shown') continue;
		if (input === 'checkbox')
			value = sent.get(name) === 'on' ? true : field.required ? false : undefined;
		else if (input === 'checkboxes') {
			const chosen = sent.getAll(name).filter((one) => field.choices?.includes(String(one)));
			value = chosen.length ? chosen.map(String) : undefined;
		} else if (input === 'references') {
			// In the order the form lists them, which keeps the order they were held in.
			const chosen = sent.getAll(name).map(String).filter(Boolean);
			value = chosen.length ? chosen : undefined;
		} else if (input === 'items') {
			const items = indexes(sent, name).map((index) =>
				read(field.fields ?? [], sent, `${name}.${index}`, creating),
			);
			for (const item of items) {
				reading.missing.push(...item.missing);
				reading.invalid.push(...item.invalid);
			}
			value = items.length ? items.map((item) => item.spec) : undefined;
		} else {
			const raw = text(sent, name);
			const taken = raw === '' ? undefined : parsed(input, field, raw);
			if (taken === INVALID) {
				reading.invalid.push(name);
				continue;
			}
			value = taken;
		}
		if (value !== undefined) reading.spec[field.name] = value;
		else if (field.required && !(input === 'password' && !creating)) reading.missing.push(name);
	}
	return reading;
}

/** An item's identity among its list's: the value of its first required `choice`. */
const identityOf = (fields: readonly Field[], item: unknown) => {
	const key = fields.find((field) => field.required && field.type === 'choice')?.name;
	return key && typeof item === 'object' && item !== null ? (item as Spec)[key] : undefined;
};

/**
 * An item as sent, completed from the one it was read as: where no secret of it was typed, what
 * the form does not send -- control's own fields, a blank secret -- is kept as held, since a
 * list is written whole; where one was, it goes with what was typed alone.
 */
function kept(fields: readonly Field[], item: Spec, before: unknown): Spec {
	const was = Array.isArray(before)
		? before.find((one) => identityOf(fields, one) === identityOf(fields, item))
		: undefined;
	if (typeof was !== 'object' || was === null) return item;
	if (fields.some((field) => field.secret && item[field.name] !== undefined)) return item;
	const out: Spec = { ...item };
	for (const field of fields) {
		const held = (was as Spec)[field.name];
		if ((!field.editable || field.secret) && out[field.name] === undefined && held !== undefined)
			out[field.name] = held;
	}
	return out;
}

/**
 * `before` as the form left it: each editable field set from `sent`, taken out where it was left
 * blank, and every key the catalog does not describe kept as it was. A blank secret keeps its own.
 */
export function edited(before: Spec, sent: Spec, fields: readonly Field[]): Spec {
	const after: Spec = { ...before };
	for (const field of fields) {
		if (!field.editable) continue;
		const value = sent[field.name];
		if (value === undefined) {
			if (!field.secret) delete after[field.name];
		} else if (inputOf(field) === 'items' && Array.isArray(value)) {
			after[field.name] = value.map((item: Spec) =>
				kept(field.fields ?? [], item, before[field.name]),
			);
		} else after[field.name] = value;
	}
	return after;
}

/** A value as one line of text: a list joined, an object as its JSON, nothing as a dash. */
export function shown(value: unknown): string {
	if (value === undefined || value === null || value === '') return '–';
	if (Array.isArray(value) && value.every((one) => typeof one !== 'object' || one === null))
		return value.join(', ');
	if (typeof value === 'object') return JSON.stringify(value);
	return String(value);
}

/**
 * A value as one line of text, as `shown` writes it, a reference or each of a list of them written
 * as what it names is called where `options` know it, the list's apart by semicolons, since a name
 * may hold a comma: an app's placements by their nodes' cities.
 */
export function said(field: Field | undefined, value: unknown, options: Options): string {
	const choices = field?.kind ? options[field.kind] : undefined;
	if (choices === undefined) return shown(value);
	const named = (one: unknown) => choices.find((choice) => choice.value === one)?.label ?? one;
	if (Array.isArray(value) && value.length > 0)
		return value.map((one) => shown(named(one))).join('; ');
	return shown(named(value));
}

/** A form's field as its input is filled: never a secret, a list or an object as its JSON. */
export function filled(field: Field, value: unknown): string {
	if (field.secret || value === undefined || value === null) return '';
	return typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value);
}
