/**
 * RFC 7386's merge patch, which a resource's `PATCH` takes: an object's keys merged one by one, a
 * `null` taking a key out, and anything else -- a list included -- set whole.
 * https://www.rfc-editor.org/rfc/rfc7386
 */
import type { Spec } from './types.ts';

const isObject = (value: unknown): value is Spec =>
	typeof value === 'object' && value !== null && !Array.isArray(value);

/** Whether two JSON values are equal, an object's keys in any order. */
export function same(a: unknown, b: unknown): boolean {
	if (a === b) return true;
	if (Array.isArray(a) && Array.isArray(b)) {
		return a.length === b.length && a.every((one, index) => same(one, b[index]));
	}
	if (!isObject(a) || !isObject(b)) return false;
	const keys = Object.keys(a);
	return (
		keys.length === Object.keys(b).length && keys.every((key) => key in b && same(a[key], b[key]))
	);
}

/** `target` with `patch` applied, neither changed. */
export function applied(target: unknown, patch: unknown): unknown {
	if (!isObject(patch)) return patch;
	const out: Spec = isObject(target) ? { ...target } : {};
	for (const [key, value] of Object.entries(patch)) {
		if (value === null) delete out[key];
		else out[key] = applied(out[key], value);
	}
	return out;
}

/**
 * The least patch that takes `before` to `after`: a key only where it changed, `null` where it
 * went, and an object descended into rather than sent whole. Empty where nothing changed.
 */
export function patchOf(before: Spec, after: Spec): Spec {
	const patch: Spec = {};
	for (const key of Object.keys(before)) if (!(key in after)) patch[key] = null;
	for (const [key, value] of Object.entries(after)) {
		const was = before[key];
		if (same(was, value)) continue;
		patch[key] = isObject(was) && isObject(value) ? patchOf(was, value) : value;
	}
	return patch;
}
