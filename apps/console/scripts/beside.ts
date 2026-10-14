/**
 * A path in another repository's checkout beside this one, written with one `*` segment for the
 * directory that repository may move it between, so the platform's registry is found whichever of
 * its `apps` groups holds it -- platform's RFC l6r4u.
 */
import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

/** The web repository, which every pattern is relative to. */
const ROOT = fileURLToPath(new URL('../../../', import.meta.url));

/**
 * `pattern` found, as an absolute path: undefined where the checkout holding it is not cloned, and
 * an error naming it where the directory after its `*` is not there exactly once.
 */
export function beside(pattern: string, root = ROOT): string | undefined {
	const [before, after, ...more] = pattern.split('/*/');
	if (before === undefined || after === undefined || more.length > 0) {
		throw new Error(`${pattern}: a pattern holds one \`/*/\``);
	}
	const parent = join(root, before);
	if (!existsSync(parent)) return undefined;
	const [name = '', ...rest] = after.split('/');
	const found = readdirSync(parent, { withFileTypes: true })
		.filter((entry) => entry.isDirectory() && existsSync(join(parent, entry.name, name)))
		.map((entry) => join(parent, entry.name, name));
	if (found.length !== 1) {
		const held = found.length === 0 ? 'none' : found.join(', ');
		throw new Error(`${pattern}: ${before}/*/${name} is to be there once, and is ${held}`);
	}
	return join(found[0] as string, ...rest);
}
