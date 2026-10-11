---
name: Interaction Ranks
title: Every ground past the page and a card is one of four ranks of the text laid thin, the light's the dark's over 1.4
supersedes: []
commits: [lib@550ec183, lib@02463ddb]
references: []
---

## Question

A hover, a selection, a control's fill and a skeleton each wanted a ground of its own, and each
had been given a gray. A fixed gray sinks back toward the page on a lighter card, two of them came
out as the same color, and the light and dark of one state did not weigh the same. How many such
grounds are there, what are they made of, and how does one carry over between themes?

## Options

In the order tried.

1. **A gray per state**, `inset` and `raised` among them. `inset` held the base's value in both
   themes; `raised` was a gray darker than the light's base, so a hover on a white field sank
   toward the page. A sidebar's hover measured the same color as the card it sat beside, `#0a0a0a`
   in the dark.
2. **The text's own color laid thin**, translucent, so it leaves whatever it lies on toward the
   text. The console's map switch already did this, and measured: selected was 5 percent black in
   the light and 7 percent white in the dark, a hover 0.7 of it. **Seven to five is 1.4**: near
   black a share reads larger, so the light takes less for the same weight.
3. **Ranks named by number**, one to four; then **by the words the text's tiers already use**,
   `subtle`, `muted`, `default`, `strong`, so one ordering reads the same wherever it appears.

## Decision

Options 2 and 3.

- **Two grounds, the page's base and a card's surface; every other ground is a rank** laid over one
  of them, and a component takes a rank, never a share of one.
- **One strength, 7 percent in the dark; the light's is it over `--interaction-ratio`, 1.4.** The
  ranks are its shares: `subtle` 0.7, `muted` 0.85 in the light and 0.8 in the dark, `default` 1,
  `strong` 1.5. The light holds `muted` further from `subtle`, where the two would read as one.
- **Where something chosen stands among what can be pointed at, the chosen takes `muted` and the
  hover `subtle`; where only a hover shows, it takes `default`.**
- 1.4 is a fact about the eye on grays, measured, not a taste: borders take it too, and text does
  not, since text stands far off its ground where a rank stands close.
