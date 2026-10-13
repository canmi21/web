# Console navigation: one tree of levels

Where a reader can be in the console and how the shell says it. What the shell looks like is
[design.md](design.md); what the console does is [../architecture/console.md](../architecture/console.md).
Decided with the author on 2026-10-09, when the sidebar's sections, one table each filtered by
scope, stopped fitting layers whose things are not alike.

## Every place is a level of one tree

**The console is a tree of levels, and the shell is drawn from the level being read.** At the root
is a view -- All, or one of the three layers of the workspace's `spec/architecture/layers.md` --
and inside it the things that view holds, each a level of its own with its own pages: a node, an
app. One answer, `levelOf` in `apps/console/src/lib/levels.ts`, gives the level's pages, the way
back up and the trail, and the sidebar, the top bar's trail, the switcher and the `<title>` are
all read from it, so none of them works out where the reader is by itself.

```
All, Infra, Platform, Services   Overview, Nodes (Infra and All), Deployments, Apps, Tasks, Events,
                                 Accounts (Infra and All)
  a node                         Overview, Apps, Events, Disk, Spec, Drift
  an app                         Overview, Usage, Deploy history, Spec
  an account                     Overview, Nodes
```

**What the registry holds has pages, and what is written there is a task**, added with the author
on 2026-10-13 -- platform's RFC cpc2b. A node's and an app's `Spec` is the registry's resource, read
and edited from the catalog; a node's `Drift` is what its host reports as wanted and not running,
running and not wanted, or behind; `Accounts` lists that kind, each a level, an account shown by its provider and its id's first eight digits, since it has no name -- platform's RFC 32hd9; a node's failure domain is its account and is not a page. Tasks
lists the ledger's tasks, and a task opened from it is a record with one page, as a run is. A kind
the registry comes to hold without a page of its own is reached under `/kinds/<plural>`, drawn from
the catalog alone, so nothing it holds is out of reach while its page waits.

**Entering a level replaces the sidebar with it.** The sidebar lists the pages of the level being
read and no other: inside a node it is that node's pages, headed by the way back -- a back arrow
and the name of the list it was entered from, `Nodes`, and nothing else. The way back is an entry
as any other, its size, its icon column, its type, the pointer's tint and the keyboard's ring,
never held selected, since it is never the page open -- RFC ew5jo. **The sidebar never names
the level it shows**: the page in the main region says what it is about, in its own title, and
the trail in the top bar says where it is, so a name over the sidebar's pages would be a third. **The move has a direction**: going
deeper, the level left slides off to the left as the new one arrives from the right, and coming
back up the two go the other way, so the reader feels which way they went -- the motion is
[design.md](design.md), "Motion is GSAP". A move between two levels of one depth, or between views,
has no slide. A level is never unfolded under its parent's entry, since a tree three deep has no
room to indent. The top bar's trail is the same path written out, `Nodes / Tokyo, Japan tyo /
Disk`, each step but the last a link, and the level's first page is left out of it, as an
address's root is.

**A record with one page is not a level.** A run opened from Deployments has a page and nothing
under it, so it keeps the level it was opened from, its section held open, and the trail names
it: `Deployments / #42`. It becomes a level when it has pages of its own.

**A level's pages are addresses.** A node's and an app's are in the query, `?tab=`, beside the span
the page is drawn over, so a page can be linked and the span carries from page to page; the root's
are paths, as before. A page never draws its level's pages a second time as tabs.

## A page's own entry goes nowhere

**An entry of the sidebar does nothing when it is the page being read, and takes the reader back to
it from anywhere under it.** Pressed on its own page -- the same path and query -- it does not
navigate, so pressing it twice never reloads or scrolls; pressed from deeper -- a run under
Deployments, a later page of a node's Events -- it is the way back to its page, which is how a page
the sidebar never lists is left. It says which in `aria-current`: `page` on its own page, `true`
with the page somewhere under it. A press with a modifier, for a new tab, is never held back.

## What waits

**A platform service gets pages of its own** -- a database's replicas and backups, the gateway's
routes -- once the shell and the pages it has are drawn as they should be; until then every app,
a service of the platform's included, is the same three pages. The tree has room for them: a
service is a level whose pages are its own.
