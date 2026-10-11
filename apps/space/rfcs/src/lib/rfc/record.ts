/**
 * What an RFC's file holds: its frontmatter and the sections of its body, read and held to the
 * format of RFC 2ut6h. Every check answers with all the problems it found.
 */
import * as v from 'valibot';
import { parse } from 'yaml';
import type { Nodes } from 'mdast';
import { ID } from './name.ts';
import { syntaxTree } from './parser.ts';

const Text = v.pipe(v.string('is empty'), v.trim(), v.nonEmpty('is empty'));
const Https = v.pipe(
	v.string('is not an https URL'),
	v.regex(/^https:\/\/\S+$/, 'is not an https URL'),
);
const list = <T extends v.GenericSchema<string>>(item: T) =>
	v.optional(v.array(item, 'is not a list'), []);

/** Where an RFC stands, in the order it moves; see RFC p992n. */
export const STATUSES = ['draft', 'accepted', 'landed', 'declined'] as const;
export type Status = (typeof STATUSES)[number];

const Reference = v.strictObject({ url: Https, took: Text, via: v.optional(Https) });

/** The frontmatter as the format writes it; see RFC 2ut6h. */
const FrontSchema = v.strictObject({
	/** A few words in title case, where a sentence will not fit: a sidebar's entry. */
	name: v.pipe(Text, v.maxLength(32, 'is longer than 32 characters')),
	/** The decision itself, as a sentence. */
	title: Text,
	/** Where it stands; see RFC p992n. */
	status: v.picklist(STATUSES, `is not one of ${STATUSES.join(', ')}`),
	/** Earlier RFCs this one replaces, by id; who replaced an RFC is read off the later one. */
	supersedes: list(v.pipe(v.string(), v.regex(ID, 'is not an id'))),
	/** RFCs that must land before this one, by id; what an RFC blocks is read off the others. */
	'blocked-by': list(v.pipe(v.string(), v.regex(ID, 'is not an id'))),
	/** `repo@hash` of each commit the decision landed in before the RFC was written. */
	commits: list(v.pipe(v.string(), v.regex(/^[a-z0-9-]+@[0-9a-f]{7,40}$/, 'is not repo@hash'))),
	/** Where what it took came from; empty when the idea is our own. */
	references: v.array(Reference, 'is not a list'),
});

export type Front = v.InferOutput<typeof FrontSchema>;
export type Reference = v.InferOutput<typeof Reference>;

/**
 * The body's sections, in the only order they may stand; the first and last are required, except
 * that a draft has no decision yet.
 */
export const SECTIONS = ['Question', 'Options', 'Evidence', 'Decision'] as const;

/** Split a file into its frontmatter's text and its body. */
export function split(text: string): { yaml: string; body: string } | undefined {
	const match = /^---\n([\s\S]*?)\n---\n?([\s\S]*)$/.exec(text);
	return match ? { yaml: match[1]!, body: match[2]! } : undefined;
}

/** Where in the frontmatter an issue is, as `references[0].url`. */
const whereOf = (issue: v.BaseIssue<unknown>) =>
	(issue.path ?? [])
		.map((item, index) =>
			typeof item.key === 'number' ? `[${item.key}]` : `${index > 0 ? '.' : ''}${String(item.key)}`,
		)
		.join('');

/**
 * What an issue says. An object's own issue is a key it lacks or one it does not know, which
 * valibot tells apart only by what it expected; `references` lacking is the one a writer is told
 * how to mend.
 */
function messageOf(issue: v.BaseIssue<unknown>): string {
	if (issue.type !== 'strict_object') return issue.message;
	if (issue.expected === 'never') return 'is not a key the format has';
	return whereOf(issue) === 'references' ? 'is missing; write [] for our own idea' : 'is missing';
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
	const result = v.safeParse(FrontSchema, data);
	if (result.success) return { front: result.output, problems: [] };
	const problems = result.issues.map((issue) => `\`${whereOf(issue)}\` ${messageOf(issue)}`);
	return { problems };
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

/** Every way a body's sections stray from the four, their order, or the ones its status asks. */
export function checkSections(body: string, status?: Status): string[] {
	const found = sections(body);
	const problems: string[] = [];
	for (const name of found)
		if (!(SECTIONS as readonly string[]).includes(name))
			problems.push(`unknown section \`${name}\``);
	const known = found.filter((name) => (SECTIONS as readonly string[]).includes(name));
	const order = known.map((name) => SECTIONS.indexOf(name as (typeof SECTIONS)[number]));
	if (order.some((at, index) => index > 0 && at <= order[index - 1]!))
		problems.push(`sections stand out of order; the order is ${SECTIONS.join(', ')}`);
	if (!known.includes('Question')) problems.push('no `## Question`');
	if (status === 'draft' && known.includes('Decision'))
		problems.push('a draft has no `## Decision`; it is `accepted` once decided');
	if (status !== 'draft' && !known.includes('Decision')) problems.push('no `## Decision`');
	return problems;
}

/** A landed RFC names the commits it landed in, and no other names any. */
export function checkStatus(front: Front): string[] {
	if (front.status === 'landed')
		return front.commits.length > 0 ? [] : ['a landed RFC names at least one commit'];
	if (front.commits.length === 0) return [];
	return [`a ${front.status} RFC landed nothing, so \`commits\` is empty`];
}

/** Every place a body leaves plain Markdown: raw HTML, or a line written as a directive. */
export function checkPlain(body: string): string[] {
	const problems: string[] = [];
	const walk = (node: Nodes) => {
		if (node.type === 'html')
			problems.push(
				`raw HTML ${JSON.stringify(node.value.slice(0, 40))}; an RFC is plain Markdown`,
			);
		if ('children' in node) for (const child of node.children) walk(child);
	};
	walk(syntaxTree(body));
	for (const [line] of body.matchAll(/^ {0,3}:{2,}[a-z][^\n]*/gm))
		problems.push(`directive ${JSON.stringify(line.trim())}; an RFC calls no component`);
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
	'md mdx ts js mjs cjs json jsonc yaml yml toml svelte css html rs py sh txt lock png svg avif webp jpg ico woff2 stylex env sql go mp4 webm vtt'.split(
		' ',
	),
);

/**
 * The author's own public names and the hosts under them, which may be written as hosts, never as
 * a mail address; see RFC p992n.
 */
const OWN =
	/^(?:[a-z0-9-]+\.)*(?:canmi\.net|canmi\.app|monoflake\.com|monoflake\.net|ffoni\.com)$/i;
const allowed = (host: string) => RESERVED.test(host) || OWN.test(host);

/** Every host, mail address and IP address in the text that could be somebody else's. */
export function checkPrivate(text: string): string[] {
	const problems: string[] = [];
	const seen = new Set<string>();
	const flag = (what: string, value: string) => {
		if (seen.has(value)) return;
		seen.add(value);
		problems.push(`${what} ${value} could be real; write a reserved one, as in example.com`);
	};
	for (const [, host] of text.matchAll(/[a-z][a-z0-9+.-]*:\/\/([^/\s:?#)\]>`'"]+)/gi))
		if (!allowed(host!) && !DOCUMENTATION.test(host!)) flag('host', host!);
	for (const [, domain] of text.matchAll(/[\w.+-]+@((?:[a-z0-9-]+\.)+[a-z]{2,63})\b/gi))
		if (!RESERVED.test(domain!)) flag('mail domain', domain!);
	for (const [name] of text.matchAll(/(?<![\w@/.:-])(?:[a-z0-9-]+\.)+[a-z]{2,63}(?![\w-])/gi)) {
		const tld = name.slice(name.lastIndexOf('.') + 1).toLowerCase();
		if (!EXTENSION.has(tld) && !allowed(name)) flag('host', name);
	}
	for (const [address] of text.matchAll(/(?<![\w.])\d{1,3}(?:\.\d{1,3}){3}(?![\w.])/g))
		if (!DOCUMENTATION.test(address)) flag('address', address);
	return problems;
}
