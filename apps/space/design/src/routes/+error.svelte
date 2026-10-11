<script lang="ts">
	/**
	 * Which of the two error pages this is, inside space's frame, so the sidebar still leads
	 * somewhere; drawn by @canmi/design, the way out given its address and report here. See
	 * spec/architecture/space.md, "Errors are the console's".
	 */
	import { page } from '$app/state';
	import { addressOf, mailtoOf } from '@canmi/me/mail';
	import { CLIENT_TITLE, pageOf, statusText } from '@canmi/web/error';
	import { report } from '@canmi/web/sentry/report';
	import ClientError from '@canmi/design/components/error-page/client.svelte';
	import Offer from '@canmi/design/components/error-page/offer.svelte';
	import StatusError from '@canmi/design/components/error-page/status.svelte';

	const address = addressOf('support');
	const client = $derived(pageOf(page.error) === 'client');
	const name = $derived(statusText(page.status));
</script>

<svelte:head>
	<title>{client ? CLIENT_TITLE : `${page.status} ${name}`}</title>
</svelte:head>

{#snippet offer()}
	<Offer
		{address}
		report={() => report(mailtoOf('support'))}
		missing={!client && page.status === 404}
	/>
{/snippet}

{#if client}
	<ClientError {offer} />
{:else}
	<StatusError status={page.status} {name} {offer} />
{/if}
