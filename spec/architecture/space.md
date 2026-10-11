# Space: canmi.app's paths, an app each behind a router

`apps/space` answers `canmi.app`, the apex, which until now only redirected to the site because
nothing was there. Space is a concept rather than a product: each path it holds is a part that
stands alone, and **each part is its own SvelteKit app, built with `paths.base` set to its path,
behind a router** -- platform's `spec/architecture/platform.md`, "One name, many apps: SPA within a
scope, MPA across". Split on 2026-10-11, when the RFCs arrived as a second part:

```
apps/space/          the router, Hono: Worker `space`, the apex's custom domain
apps/space/design/   /design, the design system: Worker `space-design`
apps/space/rfcs/     /rfcs, the RFCs: Worker `space-rfcs`
libs/space-ui/       what both draw -- the frame, the prose, the specimens
rfcs/                the RFCs themselves, read by apps/space/rfcs at build
```

**The router sends a path on by its first segment, through a service binding**, never by fetching
it again over the network; a part's app is bound to it and has no route of its own. What belongs
to the name rather than to a part is the router's: `/`, which redirects to the site until there is
something to hold, and the files every host carries. **Locally the router runs in workerd with the
same bindings**, each bound to its part's development server, so the code that routes in
production is the code that routes on a laptop.

**`rfcs/` and its app are to leave for a repository of their own once the UI they draw settles**:
a repository of its own reads its UI from npm, whose release and sync cost minutes a turn, while
the UI is still drawn a turn at a time. `libs/space-ui` goes to npm then.

## Everything here is public

The apex is outside Access, and every part of space is meant to be read by anybody: the design
system as a site of its own, and the docs and the specs once they are written for readers. Nothing
in space signs anybody in.

## Rendered on request, prerendered by choice

**Every page is rendered in the Worker; a page whose content a build already knows says
`export const prerender = true`** and is served from the assets instead, with no Worker running.
The choice is per route and never per app, so the app is never locked out of either.

Rendering on request is the default because the console's short edge cache does for a dynamic page
what a static build does for a fixed one -- spec/architecture/console.md, "The console's server
never waits on data; it only draws" -- and because a part such as an API tester may one day draw
around a reader's credentials, which no static build can.

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
then split into its layers and moved into the system, which space then reads it back from. The site and the CMS each keep a style of their own until there is time to
move them -- [../issues/site.md](../issues/site.md) and [../issues/cms.md](../issues/cms.md).

## The shell is the console's

Both are framed by `@canmi/design`'s shell -- lib's `spec/design/layouts.md`, "The shell" -- so
every width, inset and scrolling region is the same in each and neither sets one. Space's sidebar
has no head, only its pages under their group headings; the top bar holds the system's layers after
Design at its left, and finding's stand-in and the switch between light and dark at its right, the
field 15rem wide and as tall as the switch. Every page is listed once, in `src/lib/pages.ts`, which
the sidebar and the top bar both read.

**The top bar names the layers, not the page.** Foundations, Primitives, Components and Layouts
follow Design as plain links, left-aligned, in the order each stands on the one before, the layer
holding the page being read in the strong tone; a layer with no page yet is named and not linked,
in the subtle tone, the pointer over it showing `not-allowed`.
Where a page is is the sidebar's to show, so the top bar carries no trail.

**A group's heading is half a link tall**, so the sidebar's list keeps its rhythm in half steps,
and its words sit at the bottom of that half, against the links it names below. `nav-heading.svelte`
takes `align`, `bottom` unless `top` is given.

**Every ground past the page and a card is an interaction rank** -- lib's `spec/design/styles.md`,
"Two grounds, and every other ground an interaction rank". Space's sidebar takes the nav link's
`muted` and `subtle`, and finding's field is set into the bar on the page's base, a step under the
bar's surface in either theme, its keys back on the surface and its hover `strong`. Worked out on
space's sidebar and bar with the author on 2026-10-11, then made the contract's.

**A specimen may hold both themes at once.** The color page draws each hue as two capsules, the
dark's value then the light's; the wells follow the page's theme and only each hue is a `ThemeScope`
of its own theme, so a reader in either theme sees both and nothing is written twice -- lib's
`spec/design/components.md`, "A theme scope". What a specimen is called stands outside its scopes,
in the page's theme. A capsule is a button that copies its token as `var(--token)`, ready to
paste into code: the pointer over it shows `copy`, and a click ticks it in white for 1.2 seconds,
each tick on its own clock so several may stand at once.

## Specimens are laid on paper

**A design page is laid out on a card as the console's overview draws its own** -- the surface, a
hairline border, its corners and its shadow, as wide as the console's map card -- so the page reads
as the console's cards read, a sheet on the ground. **The one exception is the box a specimen
stands in, which is the card again on the page's own ground**: what it holds may be a card, and a
card is drawn to stand on the ground, never on another card. Decided with the author on 2026-10-11,
after a page with nothing under its specimens read as no page at all; the card's head and the box's
size are still being settled on the color page, which holds one example of each.

The pieces that draw specimens are space's own, in `src/lib/specimen/`.

## Its mark is a circle in information's blue

Space's favicon is one circle in `--status-info`'s light value: an SVG -- the circle written as its
hex, `#0070f7`, and as the oklch it is where a browser draws that, `oklch(0.576 0.219 258.6)`, since
a favicon reads no stylesheet of the page's -- and an ICO derived from it, drawn by the browser at
16, 32 and 48 pixels. Both are objects under their content ids, registered under `space` in
`data/record/symlinks.json`. As the site's head does, the root layout's server asks the alias layer
what each resolves to at render and the head names those objects, so a browser fetches the bytes
with no redirect; `src/routes/[mark=mark]` follows the names a browser asks for on its own,
`/favicon.ico` above all -- platform's `spec/architecture/delivery.md`, "A head names its marks by
the objects they resolve to at render", which also says how this went wrong twice first. Drawn in
the focus ring's blue on 2026-10-11, and in information's the same day, when the ring stepped off
it.

## Errors are the console's

**A page that fails is drawn as the console draws one**, inside space's frame: `@canmi/design`'s
error pages -- lib's `spec/design/components.md`, "An error page" -- given the support address and
the report form here, which of the two `@canmi/web/error`'s stamp decides. Where the frame itself
fails, `src/error.html` stands in, the console's static page. Errors go to Sentry under space's own
DSN, `EXTERNAL.sentry.space`, and development loads the reporter and sends nothing, as the
console's does.

## Defined once, rendered here, later

The docs and the specs are to be written where the work is -- a repository's `spec/` -- and read
from there at build time into pages, so one file is both the rule an agent follows and the page a
reader reads. Neither has a route yet; the design system comes first. What is open about it is
[../issues/space.md](../issues/space.md).
