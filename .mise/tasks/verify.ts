#!/usr/bin/env node
//MISE description="Every gate a change reaches: `verify [--all] [--since REV] [--dry-run] [--files ...]`"
/**
 * The gates a change has to pass, chosen by what it touched: the workspace's engine, with this
 * repository's gates. See the workspace's spec/architecture/repos.md, "verify runs what a change
 * reaches".
 */
import type * as Verify from '../../../../.mise/tasks/change/verify.ts';
import { LAYOUT, shared } from './workspace.ts';

const { main } = (await import(shared('change/verify.ts'))) as typeof Verify;

export const CONFIG: Verify.Config = {
	layout: LAYOUT,
	// `polish` reads the RFCs beside this repository, and `check-contracts` the producers' schemas,
	// both changing without touching it.
	always: ['secrets', 'refs', 'comments', 'polish', 'check-contracts'],
	// tsc reads three programs, vitest one suite, oxlint the tree.
	node: ['check', 'lint', 'test'],
	packageGates: {
		'@canmi/site': [
			'check-site',
			'check-css',
			'check-css-budget',
			'check-worker',
			'check-css-extraction',
			'check-css-enumeration',
			'check-css-ramp',
		],
		'@canmi/cms': ['check-cms'],
		'@canmi/prose': ['check-prose'],
		'@canmi/social': ['check-social'],
		'@canmi/fonts': ['check-fonts'],
		'@canmi/status': ['check-status'],
		'@canmi/landing': ['check-landing'],
		'@canmi/console': ['check-console'],
		'@canmi/space': ['check-space'],
		'@canmi/space-design': ['check-space-design'],
		'@canmi/space-rfcs': ['check-space-rfcs'],
		'@canmi/space-ui': ['check-space-ui'],
	},
	rust: ['lint-rust', 'test-rust'],
	tasks: [],
	// Read by the site's build and the corpus tests rather than imported, so no graph reaches them.
	reaches: (path) =>
		path.startsWith('contents/') || path.startsWith('data/') ? { packages: ['@canmi/site'] } : {},
};

if (import.meta.main) main(CONFIG);
