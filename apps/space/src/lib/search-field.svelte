<script lang="ts">
	/**
	 * A stand-in for finding, in the top bar beside the theme switch, until finding is drawn again:
	 * drawn as a field, made live in place by a press or ⌘K, and answering nothing typed into it.
	 * Escape, or leaving it empty, puts the field back.
	 */
	import * as stylex from '@stylexjs/stylex';
	import { tick } from 'svelte';
	import Icon from '@canmi/design/components/icon.svelte';
	import { borderWidth, duration, fontSize, radius } from '@canmi/design/scale.stylex';
	import SearchIcon from '@tabler/icons-svelte-runes/icons/search';

	let live = $state(false);
	let query = $state('');
	let input: HTMLInputElement | undefined = $state();

	async function open() {
		live = true;
		await tick();
		input?.focus();
	}

	function close() {
		live = false;
		query = '';
	}

	function shortcut(event: KeyboardEvent) {
		if (event.key.toLowerCase() === 'k' && (event.metaKey || event.ctrlKey)) {
			event.preventDefault();
			void open();
		}
	}

	const styles = stylex.create({
		/** As tall as the icon button beside it; the keys inset as far from the side as the edges. */
		field: {
			display: 'flex',
			width: '100%',
			height: '2rem',
			alignItems: 'center',
			gap: '0.5rem',
			paddingLeft: '0.625rem',
			paddingRight: '0.3125rem',
			borderRadius: radius.md,
			borderWidth: 0,
			backgroundColor: {
				default: 'var(--background-surface)',
				':hover': 'var(--interaction-strong)',
			},
			boxShadow: `0 0 0 ${borderWidth.hairline} var(--border-default)`,
			color: { default: 'var(--foreground-muted)', ':hover': 'var(--foreground-strong)' },
			fontSize: fontSize.body,
			textAlign: 'left',
			cursor: 'pointer',
			transitionProperty: 'background-color, color',
			transitionDuration: duration.base,
		},
		/** The field made live, standing where it stood, as it looked. */
		live: {
			backgroundColor: {
				default: 'var(--background-surface)',
				':hover': 'var(--background-surface)',
			},
			color: 'var(--foreground-muted)',
			cursor: 'text',
		},
		input: {
			minWidth: 0,
			flexGrow: 1,
			borderWidth: 0,
			padding: 0,
			backgroundColor: 'transparent',
			color: 'var(--foreground-strong)',
			fontSize: 'inherit',
			outline: { default: 'none', ':focus-visible': 'none' },
			'::placeholder': { color: 'var(--foreground-muted)' },
			// The browser's own clearing cross, which a field that finds nothing has no use for.
			'::-webkit-search-cancel-button': { appearance: 'none' },
		},
		word: { minWidth: 0, flexGrow: 1, overflow: 'hidden', textOverflow: 'ellipsis' },
		keys: { display: 'flex', flexShrink: 0, gap: '0.125rem' },
		key: {
			display: 'flex',
			minWidth: '1.375rem',
			height: '1.375rem',
			alignItems: 'center',
			justifyContent: 'center',
			paddingInline: '0.25rem',
			borderWidth: borderWidth.hairline,
			borderStyle: 'solid',
			borderColor: 'var(--border-default)',
			borderRadius: radius.sm,
			backgroundColor: 'var(--background-base)',
			color: 'var(--foreground-muted)',
			fontFamily: 'var(--font-mono)',
			fontSize: fontSize.caption,
		},
	});
</script>

<svelte:window onkeydown={shortcut} />

{#if live}
	<label class={stylex.attrs(styles.field, styles.live).class}>
		<Icon icon={SearchIcon} size={16} />
		<input
			bind:this={input}
			bind:value={query}
			type="search"
			aria-label="Search"
			placeholder="Search…"
			autocomplete="off"
			spellcheck="false"
			class={stylex.attrs(styles.input).class}
			onkeydown={(event) => event.key === 'Escape' && close()}
			onblur={() => query === '' && close()}
		/>
	</label>
{:else}
	<button type="button" aria-label="Search" class={stylex.attrs(styles.field).class} onclick={open}>
		<Icon icon={SearchIcon} size={16} />
		<span class={stylex.attrs(styles.word).class}>Search…</span>
		<span aria-hidden="true" class={stylex.attrs(styles.keys).class}>
			<kbd class={stylex.attrs(styles.key).class}>⌘</kbd>
			<kbd class={stylex.attrs(styles.key).class}>K</kbd>
		</span>
	</button>
{/if}
