import { dev } from '$app/env';
import type { Theme } from '@canmi/design/theme';
import { marks } from '@canmi/space-ui/marks';
import type { LayoutServerLoad } from './$types';

/**
 * The marks the head names, resolved at render; see @canmi/space-ui's marks.ts. And the reader's
 * theme from the cookie the first frame's script writes, so a specimen writes a value in it as the
 * server renders; none on a first visit, before the script has written one.
 */
export const load: LayoutServerLoad = async ({ cookies }) => {
	const cookie = cookies.get('theme');
	const theme: Theme | undefined = cookie === 'light' || cookie === 'dark' ? cookie : undefined;
	return { marks: await marks(dev), theme };
};
