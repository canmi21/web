<script lang="ts" module>
	/** What a hidden value is drawn as: the same whatever its length, so the length is not told. */
	export const DOTS = '••••••••';
</script>

<script lang="ts">
	/**
	 * A value drawn hidden until the reader asks to see it, and hidden again on asking: a field the
	 * catalog marks `masked`. Held by this one value alone and by nothing that outlives the page.
	 * Platform's RFC cpc2b, "A field the catalog marks `masked`".
	 */
	import Icon from '@canmi/design/components/icon.svelte';
	import IconButton from '@canmi/design/components/icon-button.svelte';
	import EyeIcon from '@tabler/icons-svelte-runes/icons/eye';
	import EyeOffIcon from '@tabler/icons-svelte-runes/icons/eye-off';

	let {
		value,
		label,
		shown = $bindable(false),
	}: {
		value: string;
		/** What the value is, which the control's name says: `value`, `identity 1 value`. */
		label: string;
		shown?: boolean;
	} = $props();
</script>

<span>{shown ? value : DOTS}</span>
<IconButton
	label="{shown ? 'Hide' : 'Show'} {label}"
	size="sm"
	aria-pressed={shown}
	onclick={() => (shown = !shown)}
>
	<Icon icon={shown ? EyeOffIcon : EyeIcon} size={16} />
</IconButton>
