# The collection: its boundaries, its model and its names

The model the plan's milestones assume, and what the milestones taken so far settled. The milestones
still to come are RFCs -- A2 RFC vfusa, A5 RFC huanh, A7 RFC qc4zi, A8 RFC 0ajul, B4 RFC vgo8c, B5
RFC wv6wm, B6 RFC ga5oq, B7 RFC ck07m, B8 RFC lh0oh, C0 RFC 45uaw to C5 RFC yhu79, and D1 RFC uta8s
to D4 RFC l4gr0 -- each saying what it changes and what it cannot start before.

## The two boundaries everything else hangs from

**The first boundary is who produced the data, not where it sits.** A location is not an authority:
R2 holds a copy of what this machine authored and is not therefore a place anything may write back
to, and a database in the cloud is authoritative for what readers did there and for nothing else.

| what                                                    | authored by | authoritative store               | written by                  |
| ------------------------------------------------------- | ----------- | --------------------------------- | --------------------------- |
| text, originals, derived cache, metadata, the id ledger | me          | the collection, on one machine    | `local`, and only it        |
| likes, reads, subscriptions, comments                   | readers     | the reader database, in the cloud | the public API, and only it |
| published objects and roots                             | derived     | the object store, mirrored to R2  | the publishing pass         |

**The second boundary is inside the relational half, and it is the one most easily lost.** The
authored metadata and the reader state are both rows in a SQL database, which is exactly why they
must never be rows in the _same_ database. The tooling is shared -- one Drizzle setup, whose
generated SQL runs on SQLite and on D1 alike -- and the databases are not.

The failure this prevents is concrete rather than tidy. Development refreshes its copy of the
reader state from production; if the authored metadata shared that database, a refresh would
overwrite rows that cannot be recomputed. One restore must never be able to destroy the corpus.

**The development role gets copies and writes nothing.** Published objects are immutable and
already served, so it reads them where they are; the reader state is dumped once and is
disposable. It never has the collection, and it never needs a full copy of anything.

## The model the milestones assume

### Three things, and what each one is allowed to do

| concept  | what it identifies                                                       | mutable?                                                             |
| -------- | ------------------------------------------------------------------------ | -------------------------------------------------------------------- |
| **rid**  | a thing, as an overlay resolving to whichever content currently means it | yes, in what it points at; the id itself never moves                 |
| **cid**  | a run of bytes                                                           | **never.** Bytes are not edited; different bytes are a different cid |
| metadata | what is known about one of the two above                                 | yes, and it is the only mutable half of the pair                     |

**A resource may hold several contents at once**, so this is not a chain of replacements: an icon
is a light file and a dark one, a photograph can carry the scan it was imported as and the better
scan that arrived later. Editing a picture, when there is an editor to do it with, produces new
bytes and therefore a new cid; what changes is which content the rid resolves to.

### Metadata is layered by one question

**Would this still be true of different bytes of the same thing?**

| answer | it belongs to | examples                                                              |
| ------ | ------------- | --------------------------------------------------------------------- |
| yes    | the **rid**   | description and alt text, category, tags, source and credit, license  |
| no     | the **cid**   | dimensions, thumbhash, color space, camera data, the derived variants |

The split is not tidiness; it is what makes replacing bytes free. `media.yaml` holds 42 paid
descriptions in nine languages today, keyed by an original's cid, so a better scan of any of them
costs either a careful migration or the money a second time. Held against the rid, a better scan
costs nothing, because the rid did not change -- which is the argument
platform's `spec/architecture/resource.md` already made when it granted ids in the
first place. What stays on the cid is what a new original invalidates anyway and what any run can
recompute.

Both layers are structured the way the type chain already is: a segment declares that its layer is
present and parseable, and a consumer binds to the shallowest segment that answers its question.

### Deleting removes one thing, and never what it pointed at

**Nothing cascades.** Deleting a rid deletes that rid. The contents it resolved to are untouched,
and so is everything else naming them.

What decides whether an object may go is a **reference table, not a counter**: one row per
reference, so "what still names this" is a query with an answer somebody can read rather than an
integer somebody maintained. A hand-kept count drifts by exactly one on any path that forgets it,
and the drift is permanent and silent in both directions -- too high leaks bytes forever, too low
deletes something that is still on a page. The table also makes a dry run explanatory: it says
which article, revision or record is holding the thing alive.

References resolve in two hops -- an article names a rid, the rid resolves to a cid -- and the row
is recorded on the second hop, so repointing a rid moves the reference with it.

**Unreferenced is not deleted.** An object nothing names becomes collectable 24 hours later, and
collection happens only when a sweep is run: a scheduled task in the cloud, and by hand locally.
Nothing disappears as a side effect of an edit.

### An article is `document.article`, and its state is counted rather than declared

**A draft is an article with no revisions, and publishing is writing the first one.** Nothing
carries a flag: the state is a row count, so the contradiction the corpus holds today -- three
articles marked `draft` while carrying a publication date -- cannot be spelled. `article` rather
than `document` because a document will be other things later, and the layer that answers "when
was this published" belongs to the narrower one.

**Every date is mechanical except the one a reader is shown.** The resource's `created` is when
that identity was granted here and its `updated` is its last change; both are written by the
machine and by nothing else. What a reader sees as the publication is the first revision's moment
and what they would see as an update is the latest one's, so neither is stored a second time.

**A revision's moment may be corrected, once and then never.** An article imported from somewhere
it was already published was published before it arrived, and the honest answer to "when was this
published" is that earlier date -- so `at` is editable, and a one-way lock taken by hand settles
it. Default unlocked; nothing takes the lock automatically.

**An id may be reserved before its thing is one.** A draft has an identity from the first
keystroke and a type only once somebody has decided what they are writing, so `type` is null until
then. That is resource.md's own rule about leaves, applied to the first segment.

**Metadata is not part of the text.** The path, the description, the dates and the lock are
attributes of the article, and the only reason they live in the source is that no record holds
them. The record that holds them also names the file the text is in, so it is the binding between
a rid and its source as well -- one answer to two questions.

**A rid is one space with one resolver.** An article, a picture and later an album are all granted
ids from the same five characters of base36, and the `type` chain says which kind a given one is.
Asking for an article by a rid that names a picture is a caller error, not an absence -- a
malformed id and a wrong kind are both 400, and only an id nothing holds is 404.

## Names

| name         | what it is                                                                           |
| ------------ | ------------------------------------------------------------------------------------ |
| `collection` | the authored data itself: text, original bytes, derived cache, the authored database |
| `local`      | the service that owns it -- the only writer, a Rust facade with a TypeScript half    |
| `cms`        | from here on, only the management surface: the editor, images, albums, reader data   |
| `api`        | the public worker, which answers for reader state and carries no authored endpoint   |
| the archive  | the Tauri client's source, at `canmi21/desktop-cms-archive` and built by nothing     |

`collection` rather than `content` because platform's `spec/architecture/resource.md`
already settled that only one thing here may be spelled "content", and that thing is the bytes a
cid identifies. A store called `content` makes "content id" read as "the id of something in the
store", which is the exact confusion that file exists to end. `library` was rejected for colliding
with `lib` on sight.

**`local` is two runtimes and one boundary.** Rust keeps what it already does well -- bytes,
derivation, the model calls, publishing -- and a TypeScript half owns the authored database, so
that its schema is the Drizzle one and there is never a second definition of it to drift. The Rust
side is the door: it answers what it can and forwards the rest. The TypeScript half is written
against a driver-agnostic Drizzle instance, because the same code runs over a local SQLite file now
and over D1 when the surface goes online, and a driver welded into the queries is the thing that
would make that a rewrite.

**The authored endpoints never live in `api`, and are never merely filtered out of it.** An
endpoint that writes the corpus and is disabled by a runtime flag is one misread environment away
from being public. `local` has to exist regardless -- workerd cannot reach the filesystem, run a
model CLI, or handle a 200MB original -- so the only question was where the metadata endpoints go,
and they go where the authored data's single writer is. What the two share is libraries, not a
deployment.

## What the tree actually holds today

Measured, because the surrounding documents describe a target and read as though it had been
reached.

**The ids were granted and the keying was not finished.** All 53 records in
`data/record/metadata.json` carry a `resource` and a parsed `type` chain, and the rids are unique.
But 45 of them are still filed under a 32-character cid while 8 icons are filed under their rid --
two keying conventions in one map, which is what `alt.rs` already blames for a join that read a rid
as a cid. `local migrate` reports nothing to do, because every record does hold an id; the key was
never its test.

**No article is a resource yet.** The catalog's media rows match the tree exactly -- 17
`media.image`, 16 screenshots, 8 icons, 6 photographs, 3 frames, 3 clips -- and the three
`document` rows describe nothing that exists.

**Two curated records were being written outside git**, until A0 closed it. The commit that moved
the records into one directory changed the doc comments in `media.rs` and `tags.rs` and not the
code: `path_for` returned `data/media.yaml` and `data/tags.yaml`, which `.gitignore` excludes. So `data/record/*`
held 46 records with 42 paid descriptions while the files the commands actually read held 38
records of newer categories and tags, no descriptions at all, and no history; running `local alt`
against that file would have bought all 42 descriptions a second time.

**Re-keying `metadata.json` is deliberately not a milestone.** The site never reads its top-level
key -- `readAssets` walks the map and indexes by the `resource` field inside each record -- and the
file retires into the authored database anyway. Restyling a file on its way out buys nothing.

## What the milestones taken so far settled

A0, A1, A3, A4, A6, B1 to B3a and F are done, and each left a rule or a reading behind.

**A6's table is rebuilt rather than maintained.** The argument against a counter was that it
drifts by one on any path that forgets it; a table written incrementally has the same failure in
a slower form. So the reference set is recomputed from the authored database on every run, which
cannot disagree with it, and lives in the derived database because that is what a thing you can
throw away is for. What is not recomputed is the clock: `unreferenced.since` is when something
stopped being named, and a run that restarted it would mean nothing ever came due.

**A0 is a salvage, not a repair.** The file it fixes is retiring at A2, so nothing here is worth
maintaining afterwards -- what matters is that the import has one input that has lost nothing. The
newer copy holds five days of categories and tags; the committed one holds the 42 descriptions.
Importing either one alone loses the other, and this is the only moment the choice exists.

**A4 came early for the same reason.** A text file under git has a history whether or not anybody
designed one; a database file has none. Revisions are the undo, and they have to exist before the
thing they are undoing does.

**A4 settled three things the editor would otherwise have had to guess.** Publishing takes no text:
the draft row is the working copy before the first publication and after every one, so there is one
place the text can be and no second place it could differ from. Publishing text that is already
published is refused rather than recorded, because a revision says what a version's text is and not
how many times a button was pressed -- which also means that changing a title is not a publication.
And bytes live beside the database rather than in it: `content` says a run of bytes exists and what
is known about it, and `data/collection/objects` holds the bytes, written before the row that names
them so that the failure a crash leaves behind is an uncollected object rather than a broken page.

That tree is not `data/bucket/objects`. The published one holds what compilation emitted and can
emit again; this one holds authored input, and is the reason C0 exists.

**B3a was marked done once while half taken**, and the half that was missing was the one that
deletes things. Both are taken now: the preview draws a draft on the page an article is read on,
and the five places the draft root lived are gone with the tree itself.

**A preview that is not the page is not a preview.** The first one rendered the body with the
site's components and nothing around them, which looked close and was not: the rail had no box to
sit in, the bar had nothing to position against, and the 197 lines of prose typography were still
in the application the body had left -- so code, tables and quotes were unstyled. The shell is one
component now, in `libs/prose`, and the site uses the same one. What stays the site's is every
snippet it passes in, because those reach for its own data.

**The editor is configured by reading the site.** Both are SvelteKit over the same components,
and every difference found so far was the site already knowing something: how StyleX's sheet
arrives in development, that the renderer has to be aliased to its source, that a Tailwind
utility written beside StyleX needs the consumer to run Tailwind. D3 and D4 make the two one
router, so configuration that already agrees is configuration nobody has to reconcile then. See
[workspace.md](workspace.md).

**The draft root was five things and none of them stored anything.** `publish.ts` built a second
root naming all nine articles where the public one named six; the API's development environment
bound that directory as its assets, with a symlink beside it because wrangler binds exactly one;
`local gc` read both roots so a sweep would not take what only the second named; and `sync`
refused a source containing the tree. A draft's bytes were in the objects tree like everything
else -- it was a name table, and its whole purpose was that a development site could read what
was not published. The CMS reads the draft row instead, which is where the writing already is,
so the purpose is served without publishing anything and all five are gone.

B1 is the decision that keeps the later ones cheap. The editor is a web client from its first day,
talking to an HTTP API that happens to be on this machine -- so D4, which puts the same surface
online, is a change of host and an added credential rather than a rewrite. It is also why the
operations stay below both shells: a second implementation behind a GUI is what would make moving
it a rewrite.

F: **Done.** The three layers and the library under them were laid out in this repository as the
repositories they became, then split: `canmi21/lattice` is this repository, `canmi21/web`, and
`monoflake/infra` and `monoflake/platform` continue from the same commit. The arrangement is
the workspace's `spec/architecture/layers.md`.

## Settled alongside the milestones

Decided while the milestones were being shaped, and kept here because the milestone each shapes has
not been taken yet. What is still open about the plan is filed as RFCs under `content`.

**The editor holds unsaved keystrokes in `localStorage`, and that is decided.** A save writes the
draft row; everything before it is the browser's, keyed by rid so two tabs on two articles do not
share a buffer. What is left is a detail of B3 rather than a question blocking it: whether a
warning on closing an unsaved tab is enough, or a recovered buffer is offered against the row.

**The authored database stays one file, and the collection stays where it is for now.** Two files
exist and that split is settled: `source.sqlite` is what a person wrote, `derived.sqlite` is what
a scan can write again, and the backup boundary is visible in the filesystem. `source.sqlite` is
not split further -- one file is one lock, one backup and joins that work, and the alternative
buys a smaller careful-backup at the cost of every join across the line.

Moving the collection out of the working tree was argued for here on a reason that turned out to
be false: version control cannot reach it, because it is ignored, and an abandoned change leaves
it untouched -- measured, not assumed. `clean` is barred from local state by its own rule. What is
actually left for C1 is growth and D2's move to another machine, neither of which presses today.
