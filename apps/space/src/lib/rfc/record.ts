/**
 * What an RFC's file holds: its frontmatter and the sections of its body, read and held to the
 * format of RFC 2ut6h. Every check answers with all the problems it found.
 */
import { parse } from 'yaml';
import { ID } from './name.ts';

export type Reference = { url: string; took: string; via?: string };

export type Front = {
	/** The decision itself, as a sentence. */
	title: string;
	/** Earlier RFCs this one replaces, by id; who replaced an RFC is read off the later one. */
	supersedes: string[];
	/** `repo@hash` of each commit the decision landed in before the RFC was written. */
	commits: string[];
	/** Where what it took came from; empty when the idea is our own. */
	references: Reference[];
};

/** The body's sections, in the only order they may stand; the first and last are required. */
export const SECTIONS = ['Question', 'Options', 'Evidence', 'Decision'] as const;
const REQUIRED = new Set(['Question', 'Decision']);

const KEYS = new Set(['title', 'supersedes', 'commits', 'references']);
const COMMIT = /^[a-z0-9-]+@[0-9a-f]{7,40}$/;

const strings = (value: unknown): value is string[] =>
	Array.isArray(value) && value.every((item) => typeof item === 'string');

const isUrl = (value: unknown) => typeof value === 'string' && /^https:\/\/\S+$/.test(value);

/** Split a file into its frontmatter's text and its body. */
export function split(text: string): { yaml: string; body: string } | undefined {
	const match = /^---\n([\s\S]*?)\n---\n?([\s\S]*)$/.exec(text);
	return match ? { yaml: match[1]!, body: match[2]! } : undefined;
}

/** Read a file's frontmatter, and every way it falls short. */
export function readFront(text: string): { front?: Front; problems: string[] } {
	const parts = split(text);
	if (!parts) return { problems: ['no frontmatter between --- lines'] };
	let data: unknown;
	try {
		data = parse(parts.yaml);
	} catch (error) {
		return { problems: [`frontmatter is not YAML: ${(error as Error).message}`] };
	}
	if (typeof data !== 'object' || data === null || Array.isArray(data)) {
		return { problems: ['frontmatter is not a mapping'] };
	}
	const raw = data as Record<string, unknown>;
	const problems: string[] = [];
	for (const key of Object.keys(raw)) if (!KEYS.has(key)) problems.push(`unknown key \`${key}\``);

	if (typeof raw.title !== 'string' || raw.title.trim() === '') problems.push('`title` is empty');
	if (!('references' in raw)) problems.push('`references` is missing; write [] for our own idea');

	const list = (key: string, valid: (item: string) => boolean, what: string) => {
		const value = raw[key] ?? [];
		if (!strings(value)) {
			problems.push(`\`${key}\` is not a list of strings`);
			return [];
		}
		for (const item of value) if (!valid(item)) problems.push(`\`${key}\`: ${item} is not ${what}`);
		return value;
	};
	const supersedes = list('supersedes', (item) => ID.test(item), 'an id');
	const commits = list('commits', (item) => COMMIT.test(item), 'repo@hash');

	const references: Reference[] = [];
	const given = raw.references ?? [];
	if (!Array.isArray(given)) problems.push('`references` is not a list');
	else
		for (const [index, item] of given.entries()) {
			const entry = item as Record<string, unknown> | null;
			const where = `\`references\`[${index}]`;
			if (typeof entry !== 'object' || entry === null) {
				problems.push(`${where} is not a mapping`);
				continue;
			}
			for (const key of Object.keys(entry))
				if (!['url', 'took', 'via'].includes(key))
					problems.push(`${where}: unknown key \`${key}\``);
			if (!isUrl(entry.url)) problems.push(`${where}: \`url\` is not an https URL`);
			if (typeof entry.took !== 'string' || entry.took.trim() === '')
				problems.push(`${where}: \`took\` is empty`);
			if (entry.via !== undefined && !isUrl(entry.via))
				problems.push(`${where}: \`via\` is not an https URL`);
			references.push(entry as Reference);
		}

	const front = { title: String(raw.title ?? ''), supersedes, commits, references };
	return { front, problems };
}

/** The body's second-level headings, outside fenced code. */
export function sections(body: string): string[] {
	const found: string[] = [];
	let fenced = false;
	for (const line of body.split('\n')) {
		if (/^(```|~~~)/.test(line)) fenced = !fenced;
		else if (!fenced && line.startsWith('## ')) found.push(line.slice(3).trim());
	}
	return found;
}

/** Every way a body's sections stray from the four, their order, or the two it must have. */
export function checkSections(body: string): string[] {
	const found = sections(body);
	const problems: string[] = [];
	for (const name of found)
		if (!(SECTIONS as readonly string[]).includes(name))
			problems.push(`unknown section \`${name}\``);
	const known = found.filter((name) => (SECTIONS as readonly string[]).includes(name));
	const order = known.map((name) => SECTIONS.indexOf(name as (typeof SECTIONS)[number]));
	if (order.some((at, index) => index > 0 && at <= order[index - 1]!))
		problems.push(`sections stand out of order; the order is ${SECTIONS.join(', ')}`);
	for (const name of REQUIRED) if (!known.includes(name)) problems.push(`no \`## ${name}\``);
	return problems;
}

/**
 * Names RFC 2606 reserves so they never resolve, the same set the refs gate exempts: a host an RFC
 * writes outside its `references` is one of these, so no example is somebody's.
 */
const RESERVED = /^(?:[a-z0-9-]+\.)*(?:test|example|invalid|localhost|example\.(?:com|net|org))$/i;
/** RFC 5737's documentation ranges, the only addresses an example may give. */
const DOCUMENTATION = /^(?:192\.0\.2|198\.51\.100|203\.0\.113)\.\d{1,3}$/;
/** A file's extension, which ends a name as a top-level domain would and is not one here. */
const EXTENSION = new Set(
	'md mdx ts js mjs cjs json jsonc yaml yml toml svelte css html rs py sh txt lock png svg avif webp jpg ico woff2 stylex'.split(
		' ',
	),
);

/** Every host, mail address and IP address in the text that could be real. */
export function checkPrivate(text: string): string[] {
	const problems: string[] = [];
	const seen = new Set<string>();
	const flag = (what: string, value: string) => {
		if (seen.has(value)) return;
		seen.add(value);
		problems.push(`${what} ${value} could be real; write a reserved one, as in example.com`);
	};
	for (const [, host] of text.matchAll(/[a-z][a-z0-9+.-]*:\/\/([^/\s:?#)\]>`'"]+)/gi))
		if (!RESERVED.test(host!) && !DOCUMENTATION.test(host!)) flag('host', host!);
	for (const [, domain] of text.matchAll(/[\w.+-]+@((?:[a-z0-9-]+\.)+[a-z]{2,63})\b/gi))
		if (!RESERVED.test(domain!)) flag('mail domain', domain!);
	for (const [name] of text.matchAll(/(?<![\w@/.:-])(?:[a-z0-9-]+\.)+[a-z]{2,63}(?![\w-])/gi)) {
		const tld = name.slice(name.lastIndexOf('.') + 1).toLowerCase();
		if (!EXTENSION.has(tld) && !RESERVED.test(name)) flag('host', name);
	}
	for (const [address] of text.matchAll(/(?<![\w.])\d{1,3}(?:\.\d{1,3}){3}(?![\w.])/g))
		if (!DOCUMENTATION.test(address)) flag('address', address);
	return problems;
}
