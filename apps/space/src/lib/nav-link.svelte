<script lang="ts">
	/**
	 * One page in a sidebar: its icon and name, the pointer's tint over it, and the selection's
	 * when it is the page being read. Drawn as the console's sidebar draws its own, so the two can
	 * be put side by side and moved into @canmi/design as one; see lib's spec/design/components.md,
	 * "What makes a component, and what does not".
	 */
	import * as stylex from '@stylexjs/stylex';
	import Icon from '@canmi/design/components/icon.svelte';
	import type { IconComponent } from '@canmi/design/components/icon';
	import { duration, fontSize, fontWeight, radius } from '@canmi/design/scale.stylex';

	let {
		href,
		label,
		icon,
		current = false,
	}: { href: string; label: string; icon: IconComponent; current?: boolean } = $props();

	const styles = stylex.create({
		link: {
			display: 'flex',
			height: '2.25rem',
			alignItems: 'center',
			gap: '0.625rem',
			paddingInline: '0.75rem',
			borderRadius: radius.md,
			backgroundColor: { default: 'transparent', ':hover': 'var(--interaction-hover)' },
			color: { default: 'var(--foreground-muted)', ':hover': 'var(--foreground-strong)' },
			fontSize: fontSize.body,
			fontWeight: fontWeight.medium,
			transitionProperty: 'color, background-color',
			transitionDuration: duration.base,
		},
		current: {
			backgroundColor: {
				default: 'var(--interaction-selected)',
				':hover': 'var(--interaction-selected)',
			},
			color: { default: 'var(--foreground-strong)', ':hover': 'var(--foreground-strong)' },
		},
	});
</script>

<a
	{href}
	aria-current={current ? 'page' : undefined}
	class={stylex.attrs(styles.link, current && styles.current).class}
>
	<Icon {icon} size={18} stroke={1.75} />
	{label}
</a>
