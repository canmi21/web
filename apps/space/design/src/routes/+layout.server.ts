import { dev } from '$app/env';
import { marks } from '@canmi/space-ui/marks';
import type { LayoutServerLoad } from './$types';

/** The marks the head names, resolved at render; see @canmi/space-ui's marks.ts. */
export const load: LayoutServerLoad = async () => ({ marks: await marks(dev) });
