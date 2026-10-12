/**
 * canmi.app's parts, each an app of its own: between two of them a link loads the other, so each
 * is named by its path rather than resolved inside either. A part not yet published is marked with
 * how far it reaches, as space's router marks it. See spec/architecture/space.md.
 */
import type { IconComponent } from '@canmi/design/components/icon';
import DesignIcon from '@tabler/icons-svelte-runes/icons/palette';
import RfcsIcon from '@tabler/icons-svelte-runes/icons/file-text';

export const PARTS = [
	{ key: 'design', label: 'Design', href: '/design/', icon: DesignIcon },
	{ key: 'rfcs', label: 'RFCs', href: '/rfcs/', icon: RfcsIcon, reach: 'nowhere' },
] as const satisfies readonly {
	key: string;
	label: string;
	href: string;
	icon: IconComponent;
	reach?: 'development' | 'nowhere';
}[];

export type Part = (typeof PARTS)[number]['key'];

/** Whether a part is reached, in development or not. */
export const reached = (part: Part, dev: boolean): boolean => {
	const { reach } = PARTS.find((one) => one.key === part)! as { reach?: string };
	return reach === undefined || (reach === 'development' && dev);
};
