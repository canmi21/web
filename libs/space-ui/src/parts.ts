/**
 * canmi.app's parts, each an app of its own: between two of them a link loads the other, so each
 * is named by its path rather than resolved inside either. See spec/architecture/space.md.
 */
import type { IconComponent } from '@canmi/design/components/icon';
import DesignIcon from '@tabler/icons-svelte-runes/icons/palette';
import RfcsIcon from '@tabler/icons-svelte-runes/icons/file-text';

export const PARTS = [
	{ key: 'design', label: 'Design', href: '/design/', icon: DesignIcon },
	{ key: 'rfcs', label: 'RFCs', href: '/rfcs/', icon: RfcsIcon },
] as const satisfies readonly { key: string; label: string; href: string; icon: IconComponent }[];

export type Part = (typeof PARTS)[number]['key'];
