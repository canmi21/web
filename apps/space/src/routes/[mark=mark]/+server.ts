import { dev } from '$app/env';
import { followSymlink, symlinkOf } from '@monoflake/sdk/symlink';
import { pickUrls } from '@monoflake/sdk';
import type { RequestHandler } from './$types';

// Space's marks at the names a browser asks for on its own, `/favicon.ico` above all, followed for
// it; the head names the objects themselves. See platform's spec/architecture/delivery.md, "A page
// follows the name for the browser".
export const GET: RequestHandler = ({ params }) =>
	followSymlink(symlinkOf(pickUrls(dev).symlink, 'space', params.mark));
