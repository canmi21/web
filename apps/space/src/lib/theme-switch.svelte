<script lang="ts">
	/** Light or dark, the reader's choice kept in the cookie the theme script reads first. */
	import { applyTheme, currentTheme, themeCookie } from '@canmi/kit/theme';
	import IconButton from '@canmi/design/components/icon-button.svelte';
	import BrightnessIcon from '@tabler/icons-svelte-runes/icons/brightness-filled';

	function flip() {
		const next = currentTheme() === 'dark' ? 'light' : 'dark';
		applyTheme(next);
		document.cookie = themeCookie(next);
	}
</script>

<IconButton label="Switch between light and dark" onclick={flip}>
	<!-- One mark for both, mirrored in the dark so its filled half changes side. -->
	<BrightnessIcon size={18} aria-hidden="true" class="dark:-scale-x-100" />
</IconButton>
