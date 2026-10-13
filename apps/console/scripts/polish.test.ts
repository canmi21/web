import { describe, expect, it } from 'vitest';
import { type Rfc, check, importsOf, marksIn, styleSites, surfaceFiles } from './polish.ts';

const RFCS = new Map<string, Rfc>([
	['8pqao', { scope: 'console', status: 'accepted' }],
	['ott7y', { scope: 'console', status: 'draft' }],
	['old00', { scope: 'console', status: 'landed' }],
	['else0', { scope: 'site', status: 'accepted' }],
]);

const page = (rfc: string, body = '<p>a page</p>') =>
	`<script lang="ts">\n\timport Unpolished from '#lib/ui/unpolished.svelte';\n\timport Part from '#lib/nodes/part.svelte';\n\timport Button from '#lib/ui/button.svelte';\n</script>\n\n<Unpolished rfc="${rfc}">${body}<Part /></Unpolished>\n`;

/** A console of one marked page, one polished page, and the parts they import. */
const tree = (marked: string, part = '<p>a part</p>') =>
	new Map([
		['src/routes/nodes/+page.svelte', marked],
		[
			'src/routes/+page.svelte',
			`<script lang="ts">\n\timport Card from '#lib/card.svelte';\n</script>\n<Card />\n`,
		],
		['src/routes/+layout.svelte', `<script>import Card from '../lib/card.svelte';</script>`],
		['src/lib/nodes/part.svelte', part],
		['src/lib/card.svelte', '<section class="card"><slot /></section>'],
		['src/lib/ui/button.svelte', '<button class="button"></button>'],
		['src/lib/ui/unpolished.svelte', '<div class="tag"></div>'],
	]);

describe('the polish check', () => {
	it('passes a marked page citing an open RFC and writing no style', () => {
		expect(check(tree(page('8pqao')), RFCS, {})).toEqual([]);
		expect(check(tree(page('ott7y')), RFCS, {})).toEqual([]);
	});

	it('fails a mark citing an RFC that does not exist, is landed, or is not the console’s', () => {
		for (const [rfc, said] of [
			['zzzzz', 'does not exist'],
			['old00', 'landed'],
			['else0', "site's"],
		] as const) {
			const problems = check(tree(page(rfc)), RFCS, {});
			expect(problems.map((one) => one.message).join(), rfc).toContain(said);
		}
	});

	it('fails a mark with no literal id', () => {
		expect(marksIn('<Unpolished rfc={id}>')).toEqual([undefined]);
		expect(check(tree('<Unpolished rfc={id}></Unpolished>'), RFCS, {})).toHaveLength(1);
	});

	it('fails a style inside a marked page, and inside a part only it imports', () => {
		const styled = page('8pqao', '<div style="gap: 1rem"></div>');
		expect(check(tree(styled), RFCS, {})).toEqual([
			{
				file: 'src/routes/nodes/+page.svelte',
				message: 'writes 1 style(s) inside an unpolished surface',
			},
		]);
		const part = `<script>const s = stylex.create({ a: {} });</script>\n<p class="x"></p>`;
		const problems = check(tree(page('8pqao'), part), RFCS, {});
		expect(problems).toEqual([
			{
				file: 'src/lib/nodes/part.svelte',
				message: 'writes 2 style(s) inside an unpolished surface',
			},
		]);
	});

	it('leaves alone what a polished page imports too, and a shared component, the mark one', () => {
		const own = surfaceFiles(tree(page('8pqao')));
		expect([...own].toSorted()).toEqual([
			'src/lib/nodes/part.svelte',
			'src/routes/nodes/+page.svelte',
		]);
	});

	it('holds a page styled when it was marked to exactly the styles it had', () => {
		const styled = page('8pqao', '<div class="grid"></div>');
		const file = 'src/routes/nodes/+page.svelte';
		expect(check(tree(styled), RFCS, { [file]: 1 })).toEqual([]);
		expect(check(tree(styled), RFCS, { [file]: 2 })[0]?.message).toContain('lower STYLED to 1');
		const more = page('8pqao', '<div class="grid"></div><p style:color="red"></p>');
		expect(check(tree(more), RFCS, { [file]: 1 })[0]?.message).toContain('1 style(s) more');
		expect(check(tree(page('8pqao')), RFCS, { 'src/lib/card.svelte': 1 })[0]?.message).toContain(
			'in no unpolished surface',
		);
	});
});

describe('styleSites', () => {
	it('counts markup outside the script and comments, and stylex.create anywhere', () => {
		const source = `<script>\n\tconst a = { class: 'x' };\n</script>\n<!-- class="no" -->\n<p class:on={a} style:width="1px"></p>\n<style>p {}</style>`;
		expect(styleSites('a.svelte', source)).toBe(3);
		expect(styleSites('a.ts', `const s = stylex.create({});\nconst c = { class: 1 };`)).toBe(1);
	});
});

describe('importsOf', () => {
	it('resolves #lib and relative paths, a `.js` to its `.ts`, and skips packages', () => {
		const files = new Set(['src/lib/levels.ts', 'src/lib/ui/a.svelte', 'src/lib/b.svelte.ts']);
		const source = `import { x } from '#lib/levels.js';\nimport A from './a.svelte';\nimport { b } from '../b.svelte.js';\nimport y from 'svelte';`;
		expect(importsOf('src/lib/ui/c.svelte', source, (path) => files.has(path))).toEqual([
			'src/lib/levels.ts',
			'src/lib/ui/a.svelte',
			'src/lib/b.svelte.ts',
		]);
	});
});
