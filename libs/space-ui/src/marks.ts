/**
 * Space's marks as the objects the alias layer resolves them to at render, so a head names their
 * bytes and the browser follows no redirect, as the site's head does. See platform's
 * spec/architecture/delivery.md, "A head names its marks by the objects they resolve to at
 * render".
 */
import { marksOf } from '@monoflake/sdk/symlink';
import { pickUrls } from '@monoflake/sdk';

export const MARKS = ['favicon.svg', 'favicon.ico'] as const;

export const marks = (dev: boolean) => marksOf(pickUrls(dev).symlink, 'space', MARKS);
