/**
 * What a page reads off control's catalog to draw a kind it does not know by heart: the kind
 * itself, by its name or its route, and what each field asks of a form. Platform's
 * spec/architecture/control.md, "It takes writes as the old registry did".
 */
import type { Catalog, Description, Field } from './catalog.gen.ts';

/** The kind named `name`, or reached at `/v1/<plural>`. */
export function describe(catalog: Catalog, name: string): Description | undefined {
	return catalog.items.find((one) => one.name === name || one.plural === name);
}

/** A field a list of objects is, rather than a list of choices. */
export const holdsObjects = (field: Field): boolean =>
	field.type === 'list' && (field.fields?.length ?? 0) > 0;

/** The field naming an item of a list of objects: its first required `choice`. */
export function identifying(field: Field): Field | undefined {
	return field.fields?.find((one) => one.required && one.type === 'choice');
}

/** The field named `name` among `fields`. */
export const fieldOf = (fields: readonly Field[], name: string): Field | undefined =>
	fields.find((one) => one.name === name);

/**
 * A write's spec with every value the catalog marks `secret` taken out, at any depth of a list of
 * objects: what may be kept, logged or shown once the write has gone.
 */
export function withoutSecrets(fields: readonly Field[], spec: unknown): unknown {
	if (typeof spec !== 'object' || spec === null || Array.isArray(spec)) return spec;
	const out: Record<string, unknown> = {};
	for (const [key, value] of Object.entries(spec)) {
		const field = fieldOf(fields, key);
		if (field?.secret) continue;
		out[key] =
			field && holdsObjects(field) && Array.isArray(value)
				? value.map((item) => withoutSecrets(field.fields ?? [], item))
				: value;
	}
	return out;
}
