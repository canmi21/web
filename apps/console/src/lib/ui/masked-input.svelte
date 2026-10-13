<script lang="ts">
	/**
	 * A text input whose content is hidden until the reader asks to see it: a field the catalog
	 * marks `masked`, filled with what is held and sent like any other. Hidden by the browser's own
	 * password input, kept out of its password manager; the control beside it names the input it
	 * shows. Platform's RFC cpc2b, "A field the catalog marks `masked`".
	 */
	import Icon from '@canmi/design/components/icon.svelte';
	import IconButton from '@canmi/design/components/icon-button.svelte';
	import EyeIcon from '@tabler/icons-svelte-runes/icons/eye';
	import EyeOffIcon from '@tabler/icons-svelte-runes/icons/eye-off';

	let {
		id,
		name,
		value,
		label,
		required = false,
		shown = $bindable(false),
	}: {
		id: string;
		name: string;
		value: string;
		/** What the input is, which the control's name says. */
		label: string;
		required?: boolean;
		shown?: boolean;
	} = $props();
</script>

<input
	{id}
	{name}
	{value}
	{required}
	type={shown ? 'text' : 'password'}
	autocomplete="off"
	data-masked
	spellcheck="false"
/>
<IconButton
	label="{shown ? 'Hide' : 'Show'} {label}"
	size="sm"
	aria-pressed={shown}
	aria-controls={id}
	onclick={() => (shown = !shown)}
>
	<Icon icon={shown ? EyeOffIcon : EyeIcon} size={16} />
</IconButton>
