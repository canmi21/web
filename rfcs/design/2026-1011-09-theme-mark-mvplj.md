---
name: Theme Mark
title: A theme is a data-theme mark any element may carry, the nearest deciding, and a component never asks which
supersedes: []
commits: [lib@b2c06f57]
references:
  - url: https://www.radix-ui.com/themes/docs/components/theme
    took: a theme given to a part of a page, every value inside it taking that theme's
---

## Question

A page in one theme had to show a value of the other: a specimen holding a hue's light and dark
side by side, whichever the reader chose. The root carried a `.dark` class, and the light's values
were declared on the root alone, so nothing inside a dark page could be light again. How does a
part of a page take a theme of its own, for one swatch or a whole window, without the system
growing a second set of names for it?

## Options

1. **Two fixed names per value**, `--status-info-light` and `--status-info-dark`, with
   `--status-info` pointing at one by theme. Nothing hard-coded, but every name of the contract
   doubled for the sake of the pages that show it.
2. **The `.dark` class kept beside a new mark**, for the apps still on the kit. A component written
   with `dark:` keys on whether any ancestor is dark, which a light part inside a dark page answers
   wrongly; a selector cannot ask for the nearest of two marks.
3. **One mark, `data-theme`, on any element**, both themes declared on it, the nearest deciding.

## Decision

Option 3.

- **A theme is `data-theme="light"` or `data-theme="dark"`, and the nearest mark decides.** The
  root carries one and any element below may carry the other; a style declares every name again on
  each mark, since a name made of others is worked out where it is declared.
- **The root's mark is set before the first frame**, from the reader's cookie or their system, so
  nothing is drawn in one theme and then shifted to the other; the cookie is the one the earlier
  control wrote, so a reader's choice carries over.
- **A component reads tokens and never asks which theme it is in**: no `dark:` variant, no branch
  on the mark. A component placed in a part held in the other theme is then right there with no
  case of its own.
- **`ThemeScope` gives a part its theme**, bare for as little as one swatch, or with its ground for
  a window onto the other theme. One set of names serves both, and no name ends in `-light` or
  `-dark`.
- **Only the apps on the system moved**: the console and space. The kit keeps its `.dark`, and the
  apps still on it are untouched until they move.
