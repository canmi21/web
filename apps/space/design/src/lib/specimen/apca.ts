/**
 * A text gray's APCA contrast on its theme's surface, the measure each text tier was chosen by --
 * RFC yvws0. APCA-W3 0.0.98G for a gray: its screen luminance, a soft clamp near black, and one
 * power for the text and one for the ground in either polarity. Read from the style's files
 * through mono.ts, so it is what the style holds.
 */
import type { Theme } from '@canmi/design/theme';
import { valueOf } from './mono.ts';

/** A gray's oklch lightness, and the sRGB level it is shown at. */
const lightness = (css: string) => Number(/oklch\(([\d.]+)/.exec(css)?.[1] ?? Number.NaN);
const encode = (y: number) => (y <= 0.0031308 ? 12.92 * y : 1.055 * y ** (1 / 2.4) - 0.055);

/** APCA's luminance of a gray at an sRGB level, clamped softly near black. */
function screen(level: number): number {
	const y = level ** 2.4;
	// APCA's clamp exponent is 1.414 as it is written, not the root of two.
	// oxlint-disable-next-line approx-constant
	return y < 0.022 ? y + (0.022 - y) ** 1.414 : y;
}

/** How far `text` stands off `ground` in APCA Lc, whichever is the lighter. */
function contrast(text: number, ground: number): number {
	if (ground > text) {
		const sapc = (ground ** 0.56 - text ** 0.57) * 1.14;
		return sapc < 0.1 ? 0 : (sapc - 0.027) * 100;
	}
	const sapc = (ground ** 0.65 - text ** 0.62) * 1.14;
	return sapc > -0.1 ? 0 : -(sapc + 0.027) * 100;
}

/** The Lc of `token`, a text gray, on the surface of `theme`. */
export function contrastOf(token: string, theme: Theme): number {
	const shown = (name: string) => screen(encode(lightness(valueOf(name, theme) ?? '') ** 3));
	return contrast(shown(token), shown('--background-surface'));
}
