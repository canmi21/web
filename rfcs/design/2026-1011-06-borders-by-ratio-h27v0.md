---
name: Borders by Ratio
title: A border is the text's own color laid thin, its dark strength set and its light's that over 1.4
supersedes: []
commits: [lib@02463ddb]
references: []
---

## Question

With the ranks derived from one strength and one ratio, the borders were still values of their
own: the light's stood nearly as heavy as the dark's. Do they follow the ratio too, and what are
they made of?

## Options

| Tier      | Before, light      | Before, dark       | Derived, dark | Derived, light |
| --------- | ------------------ | ------------------ | ------------- | -------------- |
| `subtle`  | a share of its own | a share of its own | 7 percent     | 7 over 1.4     |
| `default` | 8 percent          | 9 percent          | 9 percent     | 9 over 1.4     |
| `strong`  | a palette gray     | a palette gray     | 24 percent    | 24 over 1.4    |

## Decision

Derived.

- **A border is the text's own color laid thin**, as a rank is, so it holds on either ground.
- **The dark's strength is set, and the light's is it over 1.4**: `subtle` the ranks' full
  strength, `default` 9 percent, `strong` 24, in the dark; the light's each over the ratio.
- The 1.4 is the ranks' own, `--interaction-ratio`: a border stands as close to its ground as a
  rank does, so the eye weighs it the same way.
