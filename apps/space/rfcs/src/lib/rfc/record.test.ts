import { describe, expect, it } from 'vitest';
import { checkPrivate, checkSections, readFront } from './record.ts';

const file = (front: string, body = '## Question\n\n## Decision\n') =>
	`---\n${front}\n---\n\n${body}`;

describe('readFront', () => {
	it('takes a filled frontmatter as it is', () => {
		const { front, problems } = readFront(
			file(
				'title: A decision\nsupersedes: [abcde]\nreferences:\n  - url: https://origin.example/\n    took: a shape',
			),
		);
		expect(problems).toEqual([]);
		expect(front).toMatchObject({ title: 'A decision', supersedes: ['abcde'], commits: [] });
	});

	it('wants a title and references, even an empty list of them', () => {
		expect(readFront(file('title:')).problems).toEqual([
			'`title` is empty',
			'`references` is missing; write [] for our own idea',
		]);
	});

	it('names every key and value out of form', () => {
		const { problems } = readFront(
			file(
				'title: t\nstatus: accepted\ncommits: [web]\nreferences:\n  - url: http://origin.example/\n    took: ""',
			),
		);
		expect(problems).toEqual([
			'`commits[0]` is not repo@hash',
			'`references[0].url` is not an https URL',
			'`references[0].took` is empty',
			'`status` is not a key the format has',
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

	it('reads no heading inside fenced code', () => {
		expect(checkSections('## Question\n```md\n## Why\n```\n## Decision')).toEqual([]);
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
		const url = ['https:', '', 'canmi.app', 'x'].join('/');
		expect(checkPrivate(`Go to ${url} or canmi.app, mail me@mail.real.org, 10.0.0.4`)).toEqual([
			'host canmi.app could be real; write a reserved one, as in example.com',
			'mail domain mail.real.org could be real; write a reserved one, as in example.com',
			'address 10.0.0.4 could be real; write a reserved one, as in example.com',
		]);
	});
});
