---
name: RFCs in Their Own Repository
title: The RFCs leave web for a repository of their own, their format's check with them, and the pages read them by path
status: draft
supersedes: [2ut6h]
commits: []
references:
  - url: https://github.com/rust-lang/rfcs
    took: a series' repository named for what it holds, in the plural
  - url: https://github.com/python/peps
    took: the same, for another series
---

## Question

The RFCs were filed under web's `rfcs/` so that their pages, being tried while the design system
was, could change in the same commit as the files they draw. Their pages are not being drawn now;
the areas they cover, the process and the design system, are followed by every repository; and
lib's rules cite them already, a rule in one repository pointing at a record kept in another. Do
the RFCs stay in web?

## Options

| Where the RFCs live                              | Against it                                                                |
| ------------------------------------------------ | ------------------------------------------------------------------------- |
| web's `rfcs/`, as now                            | Every repository's record kept inside one of them, its history with web's |
| A repository of their own, read by path from web | Two checkouts to build the pages, a sibling the workspace already gives   |

What the repository is called, the rest of the workspace's names being singular:

| Name   | For it                                                                          | Against it                                         |
| ------ | ------------------------------------------------------------------------------- | -------------------------------------------------- |
| `rfc`  | Reads alongside `lib` and `web`                                                 | Says one request for comments, where it holds many |
| `rfcs` | Says what it holds, as `/rfcs` does and as RFC 2ut6h's plural `rfcs/` was given | The one name in `repos.toml` ending in an s        |

`lib` and `web` are no precedent for the singular: a library is one collection of many packages,
and the web is a domain, neither counted, where an RFC is one document and a repository holds many;
the other names are domains or proper names as well. `rfcs`, then, as other series' repositories
are named. The tasks stay `new-rfc` and `check-rfc`, since each acts on one.

What a repository of their own takes:

- **The files and the format's check move together**: the areas, `scopes.yaml`, `new-rfc` and
  `check-rfc`, with the schema they hold a file to, so the repository verifies itself.
- **The pages stay in web**, still unpublished, and read the files from the sibling checkout as
  they read `rfcs/` now; the path is the one thing that changes, and the schema is imported from
  there rather than kept twice.
- **The rule that a rule cites its RFC by id moves to the workspace**, since every repository
  follows it; web's `spec/repository.md` keeps only where its pages read from.
- **The repository starts from the files as they are.** An RFC is not edited once decided, so its
  history in web is the history of its filing alone, which web keeps.
