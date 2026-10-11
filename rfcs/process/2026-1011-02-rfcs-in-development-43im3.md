---
name: 'RFCs in Development'
title: The RFCs are read in development alone until their pages are drawn, and cited by id everywhere
supersedes: []
commits: []
references: []
---

## Question

The RFCs are being written now, while the design system their pages are drawn with is still being
decided. Waiting for the system holds the reasons back; publishing the pages as they are shows a
draft. How do the RFCs get written and cited from today without either?

## Options

| What happens to the RFCs                 | Against it                                         |
| ---------------------------------------- | -------------------------------------------------- |
| Wait to write them until the pages stand | The reasons pile up in `spec/` and in conversation |
| Publish the pages as they are            | A draft of the design system, read by anybody      |
| Write and read them now, unpublished     | Nothing a reader outside sees, which is the point  |

## Decision

Write and read them now, unpublished.

- **The router reaches a part in development alone when the part says so**, and the RFCs say so:
  in production `/rfcs` answers 404, and the corner's menu of parts leaves them out.
- **A rule cites an RFC by its id, `RFC 2ut6h`, and nothing more.** In development the citation is
  a link to `/rfcs/{id}`, which sends the reader on to wherever that RFC is filed; elsewhere it is
  the id as words. An area's name is never drawn as an id, so the two never meet in a path.
- **So the specs can be dried now**: a reason moves out of `spec/` into an RFC as soon as it is
  written, the rule left with its citation, while nobody outside reads either.
- **Both lift together** once the RFCs' pages are drawn by the settled system: the part loses its
  mark, and every citation becomes a link.
