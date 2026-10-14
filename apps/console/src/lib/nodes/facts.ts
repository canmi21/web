/**
 * What a person declares of each node rather than what it measures, the axes infra's
 * spec/architecture/nodes.md names: its tier, system and expiry as the registry says them -- RFC
 * 17b3o -- and its failure domain, still a copy of infra's nodes/nodes.toml.
 */
import type { Node, NodeFact } from '../server/nodes.ts';

export interface Facts {
	/** None until the registry has said. */
	tier?: NodeFact['tier'];
	/**
	 * The account it is held under, as its provider's code -- `oci`, or `oci-2` for a second account
	 * there: nodes in one fail together, save `int`, where each node is a domain of its own --
	 * infra's spec/architecture/nodes.md. A person reads it by `providerName`.
	 */
	domain: string;
	/** Until when it is expected to be held, a year; none for a node at home. */
	expiry?: number;
	/** None until the registry has said. */
	system?: NodeFact['system'];
}

/** Each node's failure domain, a copy of infra's nodes/nodes.toml until RFC 32hd9 settles it. */
const DOMAINS: Record<Node, string> = {
	tyo: 'oci',
	nrt: 'oci',
	hnd: 'oci',
	sin: 'oci-2',
	gvx: 'az',
	bru: 'az',
	buf: 'rkn',
	rdu: 'int',
	sha: 'int',
};

/** Every node, in the order the domains are declared: by failure domain, home last. */
export const CODES = Object.keys(DOMAINS) as Node[];

/**
 * Each node's facts as the registry last said them, kept in the one object every reader holds;
 * its domain alone until it has said anything.
 */
export const FACTS = Object.fromEntries(
	CODES.map((code) => [code, { domain: DOMAINS[code] }]),
) as Record<Node, Facts>;

/** What the registry said of the nodes, taken in, on the server and in the browser alike. */
export function learnFacts(facts: Readonly<Record<string, NodeFact>>): void {
	for (const code of CODES) {
		const { tier, system, expiry } = facts[code] ?? {};
		FACTS[code] = { tier, domain: DOMAINS[code], expiry, system };
	}
}

/**
 * Each provider's name as a person reads it, by its code: platform's
 * spec/architecture/gateway.md, "Providers are short codes, registered here". A copy until the
 * `@monoflake/sdk` the console resolves names them in `GATEWAY.providers`; ./facts.test.ts holds
 * it against the domains above.
 */
export const PROVIDERS: Readonly<Record<string, string>> = {
	oci: 'Oracle',
	az: 'Azure',
	rkn: 'RackNerd',
	int: 'Self-hosted',
	cf: 'Cloudflare',
	vcl: 'Vercel',
};

/** A failure domain by its provider's name, `oci-2` as `Oracle 2`; a code it lacks as written. */
export function providerName(domain: string): string {
	const [, code = '', account] = /^([a-z]+)(?:-(\d+))?$/.exec(domain) ?? [];
	const name = PROVIDERS[code];
	if (!name) return domain;
	return account ? `${name} ${account}` : name;
}
