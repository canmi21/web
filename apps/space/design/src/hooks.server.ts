import { dev } from '$app/env';
import { fillTheme } from '@canmi/design/theme';
import { EXTERNAL } from '@canmi/me/urls';
import { serverHandles } from '@canmi/web/sentry/server';
import { stamp } from '@canmi/web/error';
import { handleErrorWithSentry } from '@sentry/sveltekit';
import { sequence } from '@sveltejs/kit/hooks';

/**
 * Every page through Sentry's handles first, development loading them and sending nothing; then
 * the reader's theme written in before it is sent, lib's spec/design/styles.md.
 */
export const handle = sequence(
	...serverHandles({ dsn: EXTERNAL.sentry.space, dev }),
	({ event, resolve }) => resolve(event, { transformPageChunk: ({ html }) => fillTheme(html) }),
);

/** An unexpected error stamped as the server's; see lib's spec/web/error.md. */
export const handleError = handleErrorWithSentry(stamp('server'));
