<script lang="ts">
	/** The top bar's right: the page's own actions, the zone every moment is written in, and the
	 * switch between light and dark. */
	import * as stylex from '@stylexjs/stylex';
	import { applyTheme, currentTheme, themeCookie } from '@canmi/design/theme';
	import { figures, text } from '@canmi/kit/tokens/vocabulary.stylex';
	import BrightnessIcon from '@tabler/icons-svelte-runes/icons/brightness-filled';
	import type { Snippet } from 'svelte';
	import IconButton from '@canmi/design/components/icon-button.svelte';
	import { offsetOf, timeZone } from '../ui/time-zone.ts';

	let { actions }: { actions?: Snippet } = $props();

	const zone = timeZone();

	function toggleTheme() {
		const next = currentTheme() === 'dark' ? 'light' : 'dark';
		applyTheme(next);
		document.cookie = themeCookie(next);
	}

	const styles = stylex.create({
		/** The zone every moment on the page is written in, quiet beside the page's own actions. */
		zone: {
			color: 'var(--foreground-muted)',
			fontSize: text.px13,
			fontVariantNumeric: figures.tabular,
		},
	});
</script>

{@render actions?.()}
<!-- The request's zone, as the charts write it; see spec/architecture/console.md. -->
<span class="select-text {stylex.attrs(styles.zone).class}" title={zone.name}>{offsetOf(zone)}</span
>
<IconButton label="Switch between light and dark" onclick={toggleTheme}>
	<!-- One mark for both, mirrored in the dark so its filled half changes side. -->
	<BrightnessIcon size={18} aria-hidden="true" class="dark:-scale-x-100" />
</IconButton>
