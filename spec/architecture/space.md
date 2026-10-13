# Space: canmi.app's paths, an app each behind a router

`apps/space` answers `canmi.app`, the apex. Space is a concept rather than a product: each path it
holds is a part that stands alone, and **each part is its own SvelteKit app, built with `paths.base`
set to its path, behind a router** -- platform's `spec/architecture/platform.md`, "One name, many
apps: SPA within a scope, MPA across".

```
apps/space/          the router, Hono: Worker `space`, the apex's custom domain
apps/space/design/   /design, the design system: Worker `space-design`
apps/space/rfcs/     /rfcs, the RFCs: Worker `space-rfcs`
libs/space-ui/       what both draw -- the frame, the prose, the specimens
../rfcs/            the RFCs themselves, the rfcs repository, read by apps/space/rfcs at build
```

**The router sends a path on by its first segment, through a service binding**, never by fetching
it again over the network; a part's app is bound to it and has no route of its own. What belongs
to the name rather than to a part is the router's: `/`, which redirects to the site until there is
something to hold, and the files every host carries. **Locally the router runs in workerd with the
same bindings**, each bound to its part's development server.

**The top bar's corner names the part being read and switches between them**, as the console's
view switcher does, with its two halves split: the name leads to the part's own home, and the mark
beside it, half a square as tall as the name's line and as wide as the mark, opens a menu of every
part, the one open checked, each a link that loads the other app. The menu opens under the corner
rather than its mark, so the parts' names stand under the corner's -- spec/console/design.md, "The
menu opens out of its title". Both are `@canmi/space-ui`'s, `part-switch.svelte` and the menu it is
drawn with.

**The RFCs' pages are slop until the design system settles**: a consumer of the system and never a
voice in deciding it, and reached nowhere, development included. **A part not yet published reaches
development alone or nowhere** -- `reach` in `src/parts.ts` and `@canmi/space-ui`'s `parts.ts` --
and one reached nowhere answers 404, is left out of the corner's menu and is not started in
development. A rule's citation of an RFC, drawn by `@canmi/space-ui`'s `rfc-ref.svelte`, is a link
only where the RFCs are reached, and until then the id as words, the pointer over it showing
`not-allowed` -- RFC ggry5. What their pages are made of is migrated onto the system once it stands.

**The RFCs are a repository of their own and their app stays here**, reading them from the
sibling checkout and holding them to their format -- RFC 7f4xx, and the workspace's `spec/rfcs.md`.

## Everything here is public

The apex is outside Access, and every part of space is meant to be read by anybody: the design
system as a site of its own, and the docs and the specs once they are written for readers. Nothing
in space signs anybody in.

## Rendered on request, prerendered by choice

**Every page is rendered in the Worker; a page whose content a build already knows says
`export const prerender = true`** and is served from the assets instead, with no Worker running.
The choice is per route and never per app -- RFC zs9c2.

**A response drawn around a reader is never cached**, at the edge or anywhere: only what is the
same for every reader goes into the Cache API, and a reader's credentials stay in the request that
carries them.

## The design system: its layers, and a style across them

What space's `/design` shows, drawn from the code itself and never a picture of it:

- **Primitives** are headless: what a control does, its keys, its focus and what assistive
  technology is told, drawing nothing. There is one set, and every component stands on it.
- **Components** bind a primitive and draw it, taking its accessibility with it. They are the
  units an interface is made of.
- **Layouts** frame a whole page: which regions stand where, which one scrolls, how they stack on
  a narrow screen. A component may be put anywhere; a layout holds the viewport and is put inside
  nothing -- lib's `spec/design/layouts.md`.
- **An interface** is what an app puts in a layout's places: its own pages, its sidebar's links,
  its top bar's links. It is the app's own.

**A style is two things, kept apart.** Its colors are values given to one contract of semantic
names -- lib's `spec/design/styles.md` holds the names and how one is made -- and light and dark are
two sets of values under it. Its components are a family, and a second family exists only where the
structure differs, never where only the colors do. A component reads the contract's names and no
color of its own, so one family takes any palette. An app picks a family and a palette, and
declares over them what is its alone.

**The console and space are the first on it**, with one style, mono, and they are moved a step at
a time, the console looking as it did after every step. **Only what the console has polished is
taken**: the sidebar with its account, the top bar, and the overview's map and timeline. A token or
a component the rest of the console uses is not the system's until that part is polished too.

**A component space needs and nothing has is made in space first**, used there as it is, and only
then split into its layers and moved into the system, which space then reads it back from. The site
and the CMS each keep a style of their own until there is time to move them -- RFC 4fnln and RFC
ei71f.

## The shell is the console's

Both are framed by `@canmi/design`'s shell -- lib's `spec/design/layouts.md`, "The shell" -- so
every width, inset and scrolling region is the same in each and neither sets one. Space's sidebar
has no head, only its pages under their group headings; the top bar holds the system's layers after
Design at its left, and finding's stand-in and the switch between light and dark at its right, the
field 15rem wide and as tall as the switch. Every page is listed once, in the design app's
`src/lib/pages.ts`, which the sidebar, the top bar and home all read.

**The sidebar has levels, as the console's does** -- spec/console/navigation.md, "Entering a level
replaces the sidebar with it". The top level is Home and each category, Color among them, under the
heading of the layer holding it. A category is a level of its own: entering it replaces the sidebar
with its pages under the way back, named for its layer, and Home is not among them; the move slides
as the console's does. **A link that enters a level ends in a chevron**, in the subtle tone and the
link's own on hover; the RFCs' areas carry it too. **A layer is a level the reader never steps
into**, as a route group is one the address never shows, turned the other way: it takes a segment of
the address, `/foundations/color/hues`, and names the way back out of its categories, and the
sidebar draws no list for it. The way back leads to the top level. A layer's address and a
category's lead to the first page drawn under them. **A page not drawn yet is named and not
linked**, in the subtle tone, the pointer over it showing `not-allowed`, as a layer with no page is
in the top bar. RFC tasde.

**The top bar names the layers, not the page.** Foundations, Primitives, Components and Layouts
follow Design as plain links, left-aligned, in the order each stands on the one before, the layer
holding the page being read in the strong tone; a layer with no page yet is named and not linked,
in the subtle tone, the pointer over it showing `not-allowed`.
Where a page is is the sidebar's to show, so the top bar carries no trail.

**What a reader would press but is not built yet is shown in its place, named and not linked, and
the pointer over it shows `not-allowed`**: never hidden, and never left as words with nothing said.
Among links it takes the subtle tone; standing alone it keeps its own. It lifts with what it leads
to -- RFC lkuqy.

**A group's heading is half a link tall**, and its words sit at the bottom of that half, against the
links it names below. `nav-heading.svelte` takes `align`, `bottom` unless `top` is given.

**Every ground past the page and a card is an interaction rank** -- lib's `spec/design/styles.md`,
"Two grounds, and every other ground an interaction rank". Space's sidebar takes the nav link's
`muted` and `subtle`, and finding's field is set into the bar on the page's base, a step under the
bar's surface in either theme, its keys back on the surface and its hover `strong`.

**A specimen may hold both themes at once.** The hues page draws each hue as two capsules, the
dark's value then the light's; the wells follow the page's theme and only each hue is a `ThemeScope`
of its own theme -- lib's `spec/design/components.md`, "A theme scope". What a specimen is called
stands outside its scopes, in the page's theme. A capsule is a button that copies its token as
`var(--token)`: the pointer over it shows `copy`, and a click ticks it in white for 1.2 seconds,
each tick on its own clock.

## Specimens are laid on paper

**A design page is laid out on a card as the console's overview draws its own** -- the surface, a
hairline border, its corners, as wide as the console's map card. **The one exception is the box a
specimen stands in, which is the card again on the page's own ground**: what it holds may be a
card, and a card stands on the ground, never on another card. A specimen with a shape of its own, a
page drawn small, stands in the box at its own proportions and is never stretched to the card.
**The card's inset is the same on every side**, and the title and the RFC are trimmed to their
capitals so the inset is measured to the letters -- `src/lib/specimen/frame.stylex.ts`. **Any box
drawn on a page is inset the same way, to what is drawn**: words to their capitals, shapes to their
edges, a first line that cannot be trimmed giving its room over the capitals back from the top --
RFC 0gmzi. The card
keeps the console's card's `radius.xl`, and the box holds `lg` -- lib's `spec/design/styles.md`, "Of
two corners nested". RFC 73ol5.

**A box stands its row in a proportion, not at a height**: the space either side is what the row
leaves, never less than 2rem, and the space above and below is that times `2`, `1`, `2/3`, `1/2` or
`1/3` and no other, never less than 2rem itself. The sides are the measure and are never moved for
the proportion, worked out from the card's width as it is -- `src/lib/specimen/box.svelte`. The
hues stand at `1/2`, every gray at `2/3`, the material groups at `1/2` and the grays of both themes
at `2`. RFC 73ol5.

**A box is measured against its own row, or against its series' anchor**: the widest row of a
series of related boxes, parallel groups on one page, which all of them then stand against at one
height. Boxes merely near each other are no series. The material groups are one, anchored on the
longest. RFC 73ol5.

**Labels under a row hang and are not centered**: only the row stands in the proportion, and a name
or value under each specimen hangs into the space below. It pushes the foot down only where the box
is too short to hold it, never nearer the edge than 1rem -- `hang` in `box.svelte`. RFC 73ol5.

**A specimen drawn in 3D rests seen from straight above**, the flat plan the server draws. A while
in sight it tours its menu's views; the pointer or the keyboard coming on stops the tour where it
stands and hands it to the reader, and nothing takes it back when they leave. Nearly out of sight it
goes back to rest, to tour again. A drag turns what is drawn, not the camera, about the line square
to the drag, the point held following the pointer; the menu, there from the first movement until
that rest, brings it to a set view. It fills its box to the edge and is cut off there. What it shows
is a relation, one level for the grounds in both themes, not the size of a step, which its own card
draws -- `src/lib/specimen/relief.svelte`.

**A pointer on a specimen shows its tip, and the keyboard alone draws a ring**: on `:focus-visible`,
flush, `0.125rem` in `--interaction-focus` wherever it is drawn, on the shape it has --
spec/styling/focus.md. Space names the kit's `--color-accent` as that blue on every theme's mark.
**Bare words are ringed on their ink, one `0.25rem` room off it on every side, the corner growing
with the words, `2/7em`**: their box trimmed to their capitals and their baseline, the ring reaching
as far up as down past a letter that falls below it, so it stays centered on the capitals, and
nothing beside them within its room and width -- RFC mpy16 and RFC 4zzb2, `@canmi/space-ui/ring`.

**Every mark of a color copies its token on a press**, `var(--token)` as code reads it, and ticks
the mark it was pressed on, each tick on its own clock: a swatch, a ramp's cell, a stop on a way,
wherever a color stands to be looked at -- `src/lib/specimen/ticks.svelte.ts`. A mark that stands
for a gray in the other theme copies the same token, which is that gray's name in either.

**A page opens on everything it shows together, with nothing said**: its first card holds every
specimen at one gap, in no groups, and no label, no value and no word beside them, only a name in a
tip and a press that copies. Each group follows on a card of its own, with when it is used and each
value under its specimen. A swatch is a well on the surface, ringed, with the color set into it and
its corner the well's less the inset -- `src/lib/specimen/swatch.svelte`.

**A card's head is its title, one sentence of the rule, and the RFC behind it**, save on home, whose
cards stand each for a category and cite none: one proportion, two to a row at most, a few of its specimens live over a
press that enters it, its title the link stretched over the card. The sentence is the shortest that
says the rule, one where one will do, with commas and periods and no other stops: no colon,
semicolon or dash, and no derivation, which is the RFC's. **It states the rule as it stands, in the
present and objectively**: neither a command, no must or only, nor a reason, and with no count in
it, only one or more. **It is plain**: it says what was chosen in ordinary words, as one would say
it aloud, with no flourish and no case made for it. **It carries at most one number, and only one
that means something**: what a value was worked out from, an APCA Lc, a ratio of ΔL\*, never how
many of a thing there are. No two cards on a page open on the same word. The RFC stands at the
head's top right on every card, a link by its place and the pointer alone, with no underline, once
the RFCs are reached. **No card takes its page's name**, the first least of all: a title names what
its card shows, plainly. RFC 5j1bf.

**A specimen is drawn in the page's theme.** Both themes stand side by side only where the rule
is why the two differ, as a hue's pair does, or on the page about light and dark itself.

**Where both themes are drawn at once and a value needs its theme's ground to be read, the box
stands on `--background-neutral`**, the one gray the two share; what names a window is written
inside it, in its theme. A bare value needs no ground, and its box keeps the page's, **unless the
values run to one end**, a stretch near black or near white; that box stands on the neutral too.
The neutral is a box's alone, never a page's or a component's. RFC oonnv.

**A value is written as CSS writes it, in the terms it was chosen in**: a ground's `oklch(0.145 0
0)`, a rank's or a border's the text's color and how much of it is laid, `oklch(1 0 0 / 4.9%)`. It
is worked out from the style's own files where the server renders, in the theme the reader's cookie
names, and follows the theme with no measuring; a first visit, before the cookie is written, fills
it in once the theme is known. What a press copies is still the
token, `var(--token)`. Why is RFC x88ri.

The pieces that draw specimens are space's own, in `src/lib/specimen/`.

## Its mark is a circle in information's blue

Space's favicon is one circle in `--status-info`'s light value: an SVG -- the circle written as its
hex, `#0070f7`, and as the oklch it is where a browser draws that, `oklch(0.576 0.219 258.6)`, no
stylesheet of the page's read -- and an ICO derived from it, drawn by the browser at
16, 32 and 48 pixels. Both are objects under their content ids, registered under `space` in
`data/record/symlinks.json`. As the site's head does, the root layout's server asks the alias layer
what each resolves to at render and the head names those objects, so a browser fetches the bytes
with no redirect; `src/routes/[mark=mark]` follows the names a browser asks for on its own,
`/favicon.ico` above all -- platform's `spec/architecture/delivery.md`, "A head names its marks by
the objects they resolve to at render".

## Errors are the console's

**A page that fails is drawn as the console draws one**, inside space's frame: `@canmi/design`'s
error pages -- lib's `spec/design/components.md`, "An error page" -- given the support address and
the report form here, which of the two `@canmi/web/error`'s stamp decides. Where the frame itself
fails, `src/error.html` stands in, the console's static page, themed as the console's is. Errors go
to Sentry under space's own DSN, `EXTERNAL.sentry.space`, and development loads the reporter and
sends nothing, as the console's does.

## Defined once, rendered here, later

The docs and the specs are to be written where the work is -- a repository's `spec/` -- and read
from there at build time into pages, so one file is both the rule an agent follows and the page a
reader reads. Neither has a route yet; the design system comes first. What is open about it is
RFC 67m5c.
