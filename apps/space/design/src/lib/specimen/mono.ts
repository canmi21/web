/**
 * Mono's values as its stylesheets write them, worked out for either theme without a browser, so a
 * specimen can write a value where the server renders it and follow the theme with no measuring.
 * Read from the files the system ships, so a value changed there is changed here.
 */
import mono from '@canmi/design/styles/mono.css?raw';
import palette from '@canmi/design/styles/mono/palette.css?raw';
import type { Theme } from '@canmi/design/theme';

/** The custom properties each rule declares, under each selector it lists, in the files' order. */
function rulesOf(css: string): { selectors: string[]; names: [string, string][] }[] {
	const bare = css.replaceAll(/\/\*[\s\S]*?\*\//g, '');
	return [...bare.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map(([, head = '', body = '']) => ({
		selectors: head.split(',').map((one) => one.trim()),
		names: [...body.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)].map(([, name = '', value = '']) => [
			name,
			// One space between terms, none inside a bracket, as a value wrapped over lines is read.
			value.replaceAll(/\s+/g, ' ').replaceAll('( ', '(').replaceAll(' )', ')').trim(),
		]),
	}));
}

/** What the root holds in `theme`: every rule that reaches a root carrying that theme's mark. */
function declared(theme: Theme): Map<string, string> {
	const marks = new Set([':root', `[data-theme='${theme}']`]);
	const held = new Map<string, string>();
	// The palette first, as the style imports it.
	for (const rule of [...rulesOf(palette), ...rulesOf(mono)])
		if (rule.selectors.some((one) => marks.has(one)))
			for (const [name, value] of rule.names) held.set(name, value);
	return held;
}

/** `+ - * /` over plain numbers, as a `calc()` with no units holds them. */
function evaluate(expression: string): number | undefined {
	const tokens = expression.match(/\d*\.?\d+|[-+*/()]/g) ?? [];
	let at = 0;
	const factor = (): number => {
		const token = tokens[at++];
		if (token === '(') {
			const inner = sum();
			at++;
			return inner;
		}
		if (token === '-') return -factor();
		return Number(token);
	};
	const product = (): number => {
		let value = factor();
		while (tokens[at] === '*' || tokens[at] === '/')
			value = tokens[at++] === '*' ? value * factor() : value / factor();
		return value;
	};
	const sum = (): number => {
		let value = product();
		while (tokens[at] === '+' || tokens[at] === '-')
			value = tokens[at++] === '+' ? value + product() : value - product();
		return value;
	};
	const value = sum();
	return Number.isFinite(value) ? value : undefined;
}

/** A value with every `var()` put in and every `calc()` worked out, innermost first. */
function resolve(value: string, held: Map<string, string>, depth = 0): string {
	if (depth > 16) return value;
	let out = value.replaceAll(
		/var\(\s*(--[\w-]+)\s*(?:,\s*([^()]*))?\)/g,
		(_, name: string, fallback?: string) => {
			const found = held.get(name) ?? fallback;
			return found === undefined ? `var(${name})` : resolve(found, held, depth + 1);
		},
	);
	// One at a time, so a `calc()` that holds another is reached once the inner one is a number.
	for (;;) {
		const next = out.replace(/calc\(([^()]*)\)/, (whole, inner: string) => {
			const number = evaluate(inner);
			return number === undefined ? whole : String(Math.round(number * 1e4) / 1e4);
		});
		if (next === out) return out;
		out = next;
	}
}

const HELD = { light: declared('light'), dark: declared('dark') };

/** What `token` comes to in `theme`, as CSS writes a color: `oklch(0.979 0 0)`. */
export function valueOf(token: string, theme: Theme): string | undefined {
	const value = HELD[theme].get(token);
	return value === undefined ? undefined : resolve(value, HELD[theme]);
}
