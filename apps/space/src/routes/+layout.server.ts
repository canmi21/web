import { dev } from '$app/env';
import { marksOf } from '@monoflake/sdk/symlink';
import { pickUrls } from '@monoflake/sdk';
import type { LayoutServerLoad } from './$types';

/**
 * The marks the head names, as the objects the alias layer resolves them to at render, so the
 * browser fetches their bytes with no redirect, as the site's head does. See platform's
 * spec/architecture/delivery.md, "A head names its marks by the objects they resolve to at
 * render".
 */
export const load: LayoutServerLoad = async () => ({
	marks: await marksOf(pickUrls(dev).symlink, 'space', ['favicon.svg', 'favicon.ico'] as const),
});
