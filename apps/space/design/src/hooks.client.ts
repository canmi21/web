import { dev } from '$app/env';
import { EXTERNAL } from '@canmi/me/urls';
import { initClient } from '@canmi/web/sentry/client';
import { stamp } from '@canmi/web/error';
import { handleErrorWithSentry } from '@sentry/sveltekit';

// Loaded in development as in production, and sent only from production; see
// spec/architecture/space.md, "Errors are the console's".
initClient({ dsn: EXTERNAL.sentry.space, dev });

/** An unexpected error stamped as the browser's, which draws the page with no status. */
export const handleError = handleErrorWithSentry(stamp('client'));
