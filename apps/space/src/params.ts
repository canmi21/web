import { defineParams } from '@sveltejs/kit/params';

/** Space's marks, as `data/record/symlinks.json` registers them under `space`. */
export const MARKS = ['favicon.ico', 'favicon.svg'] as const;

const matchMark = (param: string): param is (typeof MARKS)[number] =>
	(MARKS as readonly string[]).includes(param);

export const params = defineParams({
	mark: (param) => (matchMark(param) ? param : undefined),
});
