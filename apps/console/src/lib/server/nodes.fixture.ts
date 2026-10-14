import type { NodeFact } from './nodes.ts';

/** Each node where infra's nodes.toml places it, as the registry answers it, for tests. */
export const PLACED: Record<string, NodeFact> = {
	tyo: { coordinates: [35.6762, 139.6503], place: 'Tokyo, Japan', core: true, home: false },
	sin: { coordinates: [1.3644, 103.9915], place: 'Singapore, Singapore', core: true, home: false },
	gvx: { coordinates: [60.5933, 16.9513], place: 'Gävle, Sweden', core: false, home: false },
	buf: {
		coordinates: [42.9405, -78.7322],
		place: 'Buffalo, United States',
		core: false,
		home: false,
	},
	nrt: { coordinates: [35.772, 140.3929], place: 'Tokyo, Narita, Japan', core: false, home: false },
	hnd: {
		coordinates: [35.5494, 139.7798],
		place: 'Tokyo, Haneda, Japan',
		core: false,
		home: false,
	},
	bru: { coordinates: [50.9014, 4.4844], place: 'Brussels, Belgium', core: false, home: false },
	rdu: {
		coordinates: [35.8776, -78.7875],
		place: 'Raleigh, United States',
		core: true,
		home: true,
	},
	sha: { coordinates: [31.2304, 121.4737], place: 'Shanghai, China', core: false, home: true },
};
