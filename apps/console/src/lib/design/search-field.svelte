<script lang="ts">
	/**
	 * A stand-in for finding, at the sidebar's head, until finding is drawn again: drawn as a field,
	 * made live in place by a press, and answering nothing typed into it. Escape, or leaving it
	 * empty, puts the field back. The same file stands in space's sidebar.
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

	const styles = stylex.create({
		field: {
			display: 'flex',
			width: '100%',
			height: '2rem',
			alignItems: 'center',
			gap: '0.5rem',
			paddingInline: '0.75rem',
			borderRadius: radius.md,
			borderWidth: 0,
			backgroundColor: {
				default: 'var(--background-surface)',
				':hover': 'var(--interaction-strong)',
			},
			boxShadow: `0 0 0 ${borderWidth.hairline} var(--border-default)`,
			color: 'var(--foreground-muted)',
			fontSize: fontSize.label,
			textAlign: 'left',
			cursor: 'pointer',
			transitionProperty: 'background-color',
			transitionDuration: duration.base,
		},
		/** The field made live, standing where it stood, as it looked. */
		live: {
			backgroundColor: {
				default: 'var(--background-surface)',
				':hover': 'var(--background-surface)',
			},
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
	});
</script>

{#if live}
	<label class={stylex.attrs(styles.field, styles.live).class}>
		<Icon icon={SearchIcon} size={16} />
		<input
			bind:this={input}
			bind:value={query}
			type="search"
			aria-label="Find"
			placeholder="Find…"
			autocomplete="off"
			spellcheck="false"
			class={stylex.attrs(styles.input).class}
			onkeydown={(event) => event.key === 'Escape' && close()}
			onblur={() => query === '' && close()}
		/>
	</label>
{:else}
	<button type="button" aria-label="Find" class={stylex.attrs(styles.field).class} onclick={open}>
		<Icon icon={SearchIcon} size={16} />
		<span class={stylex.attrs(styles.word).class}>Find…</span>
	</button>
{/if}
