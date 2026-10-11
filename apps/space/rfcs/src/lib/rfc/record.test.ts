import { describe, expect, it } from 'vitest';
import {
	checkPlain,
	checkPrivate,
	checkSections,
	checkStatus,
	readFront,
	type Status,
} from './record.ts';

const file = (front: string, body = '## Question\n\n## Decision\n') =>
	`---\n${front}\n---\n\n${body}`;

describe('readFront', () => {
	it('takes a filled frontmatter as it is', () => {
		const { front, problems } = readFront(
			file(
				'name: A Decision\ntitle: A decision\nstatus: accepted\nsupersedes: [abcde]\nreferences:\n  - url: https://origin.example/\n    took: a shape',
			),
		);
		expect(problems).toEqual([]);
		expect(front).toMatchObject({ title: 'A decision', supersedes: ['abcde'], commits: [] });
	});

	it('wants a title, a status and references, even an empty list of them', () => {
		expect(readFront(file('title:')).problems).toEqual([
			'`name` is missing',
			'`title` is empty',
			'`status` is missing',
			'`references` is missing; write [] for our own idea',
		]);
	});

	it('names every key and value out of form', () => {
		const { problems } = readFront(
			file(
				'name: t\ntitle: t\nstatus: done\ncommits: [web]\nreferences:\n  - url: http://origin.example/\n    took: ""',
			),
		);
		expect(problems).toEqual([
			'`status` is not one of draft, accepted, landed, declined',
			'`commits[0]` is not repo@hash',
			'`references[0].url` is not an https URL',
			'`references[0].took` is empty',
		]);
	});
});

describe('checkSections', () => {
	it('takes the two required alone, and the four in order', () => {
		expect(checkSections('## Question\n## Decision')).toEqual([]);
		expect(checkSections('## Question\n## Options\n## Evidence\n## Decision')).toEqual([]);
	});

	it('refuses an unknown section, a wrong order, and a missing decision', () => {
		expect(checkSections('## Decision\n## Question\n## Why')).toEqual([
			'unknown section `Why`',
			'sections stand out of order; the order is Question, Options, Evidence, Decision',
		]);
		expect(checkSections('## Question')).toEqual(['no `## Decision`']);
	});

	it('wants a draft without a decision, and every other status with one', () => {
		expect(checkSections('## Question\n## Options', 'draft')).toEqual([]);
		expect(checkSections('## Question\n## Decision', 'draft')).toEqual([
			'a draft has no `## Decision`; it is `accepted` once decided',
		]);
		expect(checkSections('## Question', 'declined')).toEqual(['no `## Decision`']);
	});

	it('reads no heading inside fenced code', () => {
		expect(checkSections('## Question\n```md\n## Why\n```\n## Decision')).toEqual([]);
	});
});

describe('checkStatus', () => {
	const front = (status: Status, commits: string[]) => ({
		name: 'A',
		title: 'a',
		status,
		supersedes: [],
		'blocked-by': [],
		commits,
		references: [],
	});

	it('wants a landed RFC to name a commit, and no other to', () => {
		expect(checkStatus(front('landed', ['web@0123abc']))).toEqual([]);
		expect(checkStatus(front('accepted', []))).toEqual([]);
		expect(checkStatus(front('landed', []))).toEqual(['a landed RFC names at least one commit']);
		expect(checkStatus(front('declined', ['web@0123abc']))).toEqual([
			'a declined RFC landed nothing, so `commits` is empty',
		]);
	});
});

describe('checkPrivate', () => {
	it('lets reserved names, documentation addresses and file names through', () => {
		expect(
			checkPrivate(
				'See https://api.example.com/v1, www.example.org, ops@team.example, db.test, 192.0.2.10, ' +
					'`rfcs/scopes.yaml`, name.ts, Node.js, e.g. this, 2026.1011.7 and lib@b684751f.',
			),
		).toEqual([]);
	});

	it('holds example under any other top-level domain to be real, since only three are reserved', () => {
		expect(checkPrivate('example.io')).toEqual([
			'host example.io could be real; write a reserved one, as in example.com',
		]);
	});

	it('names a real host, mail domain and address once each', () => {
		// Joined, so the repository's own URL gate does not read a real address in this file.
		const url = ['https:', '', 'shop.real.org', 'x'].join('/');
		expect(checkPrivate(`Go to ${url} or shop.real.org, mail me@mail.real.org, 10.0.0.4`)).toEqual([
			'host shop.real.org could be real; write a reserved one, as in example.com',
			'mail domain mail.real.org could be real; write a reserved one, as in example.com',
			'address 10.0.0.4 could be real; write a reserved one, as in example.com',
		]);
	});

	it("lets the author's own hosts through, though never as a mail domain", () => {
		const url = ['https:', '', 'cdn.monoflake.com', 'x'].join('/');
		expect(checkPrivate(`${url}, canmi.app, api.ffoni.com, me@canmi.net`)).toEqual([
			'mail domain canmi.net could be real; write a reserved one, as in example.com',
		]);
	});
});

describe('checkPlain', () => {
	it('takes Markdown and GFM, and refuses HTML and a directive', () => {
		expect(checkPlain('| a | b |\n| - | - |\n| 1 | 2 |\n\nText: with a colon.')).toEqual([]);
		expect(checkPlain('<div style="x">a</div>\n\n::swatch{a=1}')).toEqual([
			'raw HTML "<div style=\\"x\\">a</div>"; an RFC is plain Markdown',
			'directive "::swatch{a=1}"; an RFC calls no component',
		]);
	});
});

describe('checkPrivate in code', () => {
	it('reads a call or a token in code as code, and a host there as a host', () => {
		expect(checkPrivate('`stylex.create` and `radius.sm`, then `shop.real.org`')).toEqual([
			'host shop.real.org could be real; write a reserved one, as in example.com',
		]);
		expect(checkPrivate('```ts\nconst a = stylex.create({});\n```')).toEqual([]);
	});
});
