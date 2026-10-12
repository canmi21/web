/**
 * The page's theme for a specimen that draws itself from the reader's own end: the server's, from
 * the reader's cookie, so it is right in the first frame, then the root's mark, followed as it
 * moves. Called while a component is set up, as an effect is.
 */
import { currentTheme, type Theme } from '@canmi/design/theme';
import { page } from '$app/state';
import { untrack } from 'svelte';

export function pageTheme(): { readonly current: Theme | undefined } {
	let theme = $state<Theme | undefined>(untrack(() => page.data.theme));
	$effect(() => {
		const root = document.documentElement;
		theme = currentTheme(root);
		const watch = new MutationObserver(() => (theme = currentTheme(root)));
		watch.observe(root, { attributes: true, attributeFilter: ['data-theme'] });
		return () => watch.disconnect();
	});
	return {
		get current() {
			return theme;
		},
	};
}
