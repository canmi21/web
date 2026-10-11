/**
 * Where an RFC is kept and what its file is called:
 * `{scope}/{yyyy}-{mmdd}-{nn}-{slug}-{id}.md`, the day it was written, its place in that day,
 * a slug for people and an id for machines. The format is RFC 2ut6h's.
 */

/** A scope's folder, an area's name. */
export const SCOPE = /^[a-z][a-z0-9-]*$/;
/** Words in lowercase, joined by single hyphens. */
export const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
/** Five of `[a-z0-9]`, unique among the RFCs and never changed. */
export const ID = /^[a-z0-9]{5}$/;

const NAME = /^(\d{4})-(\d{2})(\d{2})-(\d{2})-([a-z0-9]+(?:-[a-z0-9]+)*)-([a-z0-9]{5})\.md$/;
const ALPHABET = 'abcdefghijklmnopqrstuvwxyz0123456789';

export type Name = { day: string; order: number; slug: string; id: string };

/** Read a file's name, or undefined when it is not one; `day` is `yyyy-mmdd`. */
export function parseName(file: string): Name | undefined {
	const match = NAME.exec(file);
	if (!match) return undefined;
	const [, year, month, date, order, slug, id] = match as unknown as string[];
	const when = new Date(Date.UTC(Number(year), Number(month) - 1, Number(date)));
	if (when.getUTCMonth() !== Number(month) - 1 || when.getUTCDate() !== Number(date)) return;
	if (Number(order) < 1) return undefined;
	return { day: `${year}-${month}${date}`, order: Number(order), slug: slug!, id: id! };
}

const pad = (value: number) => String(value).padStart(2, '0');

export function formatName({ day, order, slug, id }: Name): string {
	return `${day}-${pad(order)}-${slug}-${id}.md`;
}

/** A name's words in lowercase, joined by hyphens: `RFC Format` is `rfc-format`. */
export const slugOf = (name: string) =>
	name
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-|-$/g, '');

/** The day in the writer's own time zone, as a file names it. */
export function today(now = new Date()): string {
	return `${now.getFullYear()}-${pad(now.getMonth() + 1)}${pad(now.getDate())}`;
}

/** A fresh id none of `taken` holds; a byte past the alphabet's last whole multiple is redrawn. */
export function newId(
	taken: ReadonlySet<string>,
	random = crypto.getRandomValues.bind(crypto),
): string {
	const limit = 256 - (256 % ALPHABET.length);
	for (;;) {
		let id = '';
		while (id.length < 5) {
			const [byte] = random(new Uint8Array(1));
			if (byte! < limit) id += ALPHABET[byte! % ALPHABET.length];
		}
		if (!taken.has(id)) return id;
	}
}

/** The URL path an RFC is read at; only its id finds it, the rest is for the reader. */
export function rfcPath(scope: string, { slug, id }: Pick<Name, 'slug' | 'id'>): string {
	return `/rfcs/${scope}/${slug}-${id}`;
}
