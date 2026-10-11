---
name: Text Tiers
title: Each text tier is one APCA contrast in both themes, 60, 75, 90 and the most there is, its lightness worked back
supersedes: []
commits: [lib@f8810338]
references:
  - url: https://github.com/Myndex/apca-w3
    took: APCA, a contrast that weighs light text on dark apart from dark text on light, and its levels by use
---

## Question

The ranks and borders carry from dark to light by one ratio. Does text, and if not, what makes a
tier read the same in both themes?

## Options

In the order tried. Measured on a card, the tiers as the palette had them, in APCA Lc:

| Tier      | Light | Dark  |
| --------- | ----- | ----- |
| `subtle`  | 78.8  | 33.2  |
| `muted`   | 92.6  | 50.8  |
| `default` | 105.4 | 94.0  |
| `strong`  | 106.0 | 107.7 |

1. **The ratio, as the ranks take it.** A lightness difference and a WCAG 2 ratio both read the two
   themes alike, so they said the dark was a tenth weaker; APCA, which reads a light text on dark
   apart from a dark one on light, showed the dark's lower tiers far under the light's, `subtle` at
   33 where a label needs about 45, and the light's `subtle` heavier than many a body text. The
   ratio holds for a step close to its ground; text stands far off it.
2. **One APCA target per tier in both themes, each lightness worked back**, the targets the levels
   APCA names for a use nearest the two themes' mean: `subtle` 60, for text that is not body;
   `muted` 75, the least for body; `default` 90, the body's recommended; `strong` the most there
   is. `default`'s mean, 99.7, fell between 90 and the most; 90 keeps it apart from `strong`.
3. **`default` held near Lc 100** to keep the light's body nearly black, offered and not taken.

## Decision

Option 2.

- **A tier is one APCA contrast on a surface, the same in both themes**: `subtle` Lc 60, `muted`
  75, `default` 90, `strong` the most there is, black or white.
- **Each theme's lightness is worked back from its target**: in mono `oklch` lightness 0.648, 0.54
  and 0.412 in the light, 0.761, 0.842 and 0.918 in the dark.
- **The ratio is for what stands close to its ground, APCA for what stands far off it**: grounds,
  ranks and borders take 1.4, text takes a target, and the two never mix.
