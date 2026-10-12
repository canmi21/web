/**
 * Where each of mono's grays stands in CIELAB L*, as a theme paints it on its own base: the measure
 * the dark's steps are held to, half again the light's -- RFC trwdn. Worked out from the style's
 * files through mono.ts, so the server has it in the first frame and it changes as they do.
 */
import type { Theme } from '@canmi/design/theme';
import { valueOf } from './mono.ts';

/** An oklch gray's lightness and its alpha, which is 1 where none is written. */
function gray(css: string): { l: number; alpha: number } {
	const [, l, alpha] = /oklch\(([\d.]+) 0 0(?: \/ ([\d.]+))?\)/.exec(css) ?? [];
	return { l: Number(l), alpha: alpha === undefined ? 1 : Number(alpha) };
}

/** sRGB's encoding and its inverse, and CIELAB's lightness of a linear luminance. */
const encode = (y: number) => (y <= 0.0031308 ? 12.92 * y : 1.055 * y ** (1 / 2.4) - 0.055);
const decode = (s: number) => (s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4);
const lStar = (y: number) => (y > 216 / 24389 ? 116 * Math.cbrt(y) - 16 : (y * 24389) / 27);

/** The L* of `token` in `theme`, laid on that theme's base as a browser blends it. */
export function lightnessOf(token: string, theme: Theme): number {
	const base = gray(valueOf('--background-base', theme) ?? '').l ** 3;
	const { l, alpha } = gray(valueOf(token, theme) ?? '');
	return lStar(decode(encode(base) * (1 - alpha) + encode(l ** 3) * alpha));
}

/** How far `token` stands off its theme's base in L*. */
export function stepOf(token: string, theme: Theme): number {
	return Math.abs(lightnessOf(token, theme) - lightnessOf('--background-base', theme));
}

/** The sRGB level, 0 to 1, of a gray at CIELAB lightness `l`, as a canvas is given it. */
export function levelOf(l: number): number {
	const y = l > 8 ? ((l + 16) / 116) ** 3 : (l * 27) / 24389;
	return Math.min(1, Math.max(0, encode(y)));
}

/** The L* of a gray at `share` of the luminance of one at `l`, as a face turned from the light. */
export function shadeOf(l: number, share: number): number {
	const y = l > 8 ? ((l + 16) / 116) ** 3 : (l * 27) / 24389;
	return lStar(y * share);
}
