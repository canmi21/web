/**
 * Every RFC under the repository's rfcs/, read at build: its place, its frontmatter, its body, and
 * the later RFC that superseded it, which is read off that one rather than written in this. A file
 * out of form fails the build; `check-rfc` says why first.
 */
import { parse } from 'yaml';
import { parseName, type Name } from './name.ts';
import { readFront, split, type Front } from './record.ts';

const FILES = import.meta.glob<string>('../../../../../../rfcs/*/*.md', {
	query: '?raw',
	import: 'default',
	eager: true,
});
const LISTS = import.meta.glob<string>('../../../../../../rfcs/scopes.yaml', {
	query: '?raw',
	import: 'default',
	eager: true,
});

export type Rfc = Name & {
	scope: string;
	front: Front;
	body: string;
	/** The RFC that replaced this one, by id. */
	supersededBy?: string;
};

/** Each area by name, with what it is about, in the order rfcs/scopes.yaml lists them. */
export const AREAS: ReadonlyMap<string, string> = new Map(
	Object.entries((parse(Object.values(LISTS)[0] ?? '') ?? {}) as Record<string, string>),
);

function read(): Rfc[] {
	const rfcs: Rfc[] = [];
	for (const [path, text] of Object.entries(FILES)) {
		const [scope, file] = path.split('/').slice(-2) as [string, string];
		const name = parseName(file);
		const { front, problems } = readFront(text);
		if (!name || !front || problems.length > 0)
			throw new Error(`${path} is out of form; run mise run check-rfc`);
		rfcs.push({ ...name, scope, front, body: split(text)?.body ?? '' });
	}
	for (const rfc of rfcs)
		for (const id of rfc.front.supersedes) {
			const earlier = rfcs.find((one) => one.id === id);
			if (earlier) earlier.supersededBy = rfc.id;
		}
	return rfcs.toSorted((a, b) => b.day.localeCompare(a.day) || b.order - a.order);
}

/** Newest first. */
export const RFCS: readonly Rfc[] = read();

export const rfcOf = (id: string) => RFCS.find((rfc) => rfc.id === id);

/** What a list shows of an RFC, without its body. */
export const summaryOf = ({ scope, day, order, slug, id, front, supersededBy }: Rfc) => ({
	scope,
	day,
	order,
	slug,
	id,
	title: front.title,
	supersededBy,
});

export type Summary = ReturnType<typeof summaryOf>;
