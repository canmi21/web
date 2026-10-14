#!/usr/bin/env node
//MISE description="The Workers a change needs packaged for the deployer, as JSON: `deployable [--all] [--since REV | --git BASE] [--files ...]`"
/**
 * The Workers a change needs packaged: the workspace's engine, over this repository's Workers that
 * have moved onto the platform's deployer; it builds no image. CI reads the list to decide what to
 * package; see platform's spec/architecture/deployer.md, "Moving a Worker onto it".
 */
import type * as Deployable from '../../../../.mise/tasks/change/deployable.ts';
import { LAYOUT, shared } from './workspace.ts';

const { main } = (await import(shared('change/deployable.ts'))) as typeof Deployable;

/**
 * The Workers the deployer deploys, one at a time; the site stays on Cloudflare's Git integration
 * until its D1 moves to Postgres.
 */
const MOVED = new Set(['console']);

export const CONFIG: Deployable.Config = {
	layout: LAYOUT,
	images: false,
	workers: { only: MOVED },
};

if (import.meta.main) main(CONFIG);
