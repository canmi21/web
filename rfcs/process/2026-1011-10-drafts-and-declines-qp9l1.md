---
name: Drafts and Declines
title: An open question's argument is filed as a draft RFC, which is decided in place or declined, and an issue cites it
supersedes: [2ut6h]
commits: []
references:
  - url: https://peps.python.org/pep-0001/
    took: a proposal filed before it is decided, and one rejected kept with its reasons
---

## Question

An RFC was written only once its decision had landed, so a question still open, or decided and
waiting its turn, kept its argument in `spec/`'s issues: the history the RFCs were made to take out
of `spec/` grew back there. Where does a question's argument live before it is decided, and what
becomes of it when the decision goes against it?

## Options

| Where an open question's argument goes    | Against it                                                         |
| ----------------------------------------- | ------------------------------------------------------------------ |
| An issue in `issues.md`, as now           | The spec grows back the history it was dried of                    |
| RFCs in place of the issues               | Issues are in every repository, often a line long, some not public |
| A draft RFC, the issue a line that cites it | One question in two places, joined by its id                     |

## Decision

A draft RFC, the issue a line that cites it.

- **`status` is `draft` or `declined`; an RFC without one is decided.** Only the two are ever
  written, so no RFC filed before them changes.
- **A draft is the argument of one planning entry**: an issue while the question is open, a todo
  entry once it is decided and waiting, the entry a line that cites it by id. Nothing on neither
  list is a draft.
- **A draft has a Question, may have Options and Evidence, and has no Decision and no commits.** It
  is edited as the question moves; its file, its day and its id never change.
- **A draft is decided in place**: `status` dropped, `## Decision` written, `commits` filled once
  the decision has landed and been pushed; from then it is frozen like any RFC.
- **A draft the decision goes against is `declined`**: its `## Decision` says what was decided
  instead, it lists no commits, and it is frozen as well. Why a thing is not done is a reason as
  much as why one is, and the id it was cited by keeps answering.
- **A later RFC supersedes an earlier one in what it decides, and no further**: the rest of the
  earlier stands, and a reader reads the two together. Only a decided RFC supersedes; a draft may
  name what it would.
- **The issues are dried as the spec is**, one at a time: an issue whose argument is a question of
  its own moves into a draft and leaves its line behind. An issue a line long, and one that is not
  for publishing, stays an issue.
- `mise run new-rfc <name> <scope> --draft` starts one; `check-rfc` holds each status to its form.
