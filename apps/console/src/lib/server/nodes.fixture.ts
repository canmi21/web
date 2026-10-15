import type { Node, NodeFact } from './nodes.ts';

/**
 * Each node's id by its hostname, for tests to read by: the hostname is the operator's, never a
 * key the console holds.
 */
export const ID = {
	tyo: 'd132b0f553e3dcc3',
	nrt: '055d9b63bb419ba4',
	hnd: '26bf596280326e7a',
	gvx: 'a0a24bbaa0c0beba',
	bru: 'abd3922110a78032',
	buf: 'e38f403f033d87f7',
	rdu: 'd62c82b23a858876',
	sha: '0196b5a8439abb66',
	sin: '9d399312d1c3ddc4',
} as const satisfies Record<string, Node>;

/** Each node as infra's nodes.toml declares it, as control answers it, by its id, for tests. */
export const PLACED: Record<string, NodeFact> = {
	[ID.tyo]: {
		coordinates: [35.6762, 139.6503],
		city: 'Tokyo',
		country: 'JP',
		core: true,
		home: false,
		tier: 'datacenter',
		system: 'debian',
		expiry: 2036,
	},
	[ID.sin]: {
		coordinates: [1.3644, 103.9915],
		city: 'Singapore',
		country: 'SG',
		core: true,
		home: false,
		tier: 'datacenter',
		system: 'debian',
		expiry: 2036,
	},
	[ID.gvx]: {
		coordinates: [60.5933, 16.9513],
		city: 'Gävle',
		country: 'SE',
		core: false,
		home: false,
		tier: 'datacenter',
		system: 'debian',
		expiry: 2030,
	},
	[ID.buf]: {
		coordinates: [42.9405, -78.7322],
		city: 'Buffalo',
		country: 'US',
		core: false,
		home: false,
		tier: 'datacenter',
		system: 'debian',
		expiry: 2027,
	},
	[ID.nrt]: {
		coordinates: [35.772, 140.3929],
		city: 'Tokyo',
		country: 'JP',
		core: false,
		home: false,
		tier: 'datacenter',
		system: 'alpine',
		expiry: 2036,
	},
	[ID.hnd]: {
		coordinates: [35.5494, 139.7798],
		city: 'Tokyo',
		country: 'JP',
		core: false,
		home: false,
		tier: 'datacenter',
		system: 'alpine',
		expiry: 2036,
	},
	[ID.bru]: {
		coordinates: [50.9014, 4.4844],
		city: 'Brussels',
		country: 'BE',
		core: false,
		home: false,
		tier: 'datacenter',
		system: 'debian',
		expiry: 2030,
	},
	[ID.rdu]: {
		coordinates: [35.8776, -78.7875],
		city: 'Raleigh',
		country: 'US',
		core: true,
		home: true,
		tier: 'home',
		system: 'debian',
	},
	[ID.sha]: {
		coordinates: [31.2304, 121.4737],
		city: 'Shanghai',
		country: 'CN',
		core: false,
		home: true,
		tier: 'home',
		system: 'debian',
	},
};
