# What is polished, and what is only built

Which of the console's surfaces are finished in how they look, and how a surface built for what it
does is told apart from one finished. Decided with the author on 2026-10-13: the console's problem is
what it lacks, not how it looks, so structure is built ahead of its look, and the UI/UX work finishes
each surface after.

## Polished

**The top bar, the sidebar, and the overview -- its verdict, the map's card and the timeline, with
the status beneath them.** Everything else is unpolished: the Nodes, Apps, Deployments and Events
pages, every level's own pages, and whatever is added.

## Structure is built apart from its look

**A surface built for what it does uses `@canmi/design`, `@canmi/kit` and the console's shared
components as they come, and writes no style of its own** -- no `stylex.create`, no `class`, no
`style`, no `<style>`. The kit gives no layout, so a layout structure needs and no shared component
gives -- a stack, a two-column detail, a form's row -- is added once as a shared component, styled
there and reused, never inside the surface. Structure is its routes, what it reads, the actions it
offers, a form's fields, its states while loading, empty and failed, and what it says to assistive
technology; how it looks is spacing, type, color, motion and the fine of its layout. A change that
styles an unpolished surface is polish, and nothing else is, so a diff says which it is.

**An unpolished surface is wrapped in `<Unpolished rfc="<id>">`**, which marks it `data-unpolished`
and, in development alone, draws a small tag at its corner; in production it adds nothing. Its RFC,
in the console's scope, names what is placeholder there, so `mise run plan` lists every surface
waiting. A check holds each mark to an RFC that exists and is not landed, and refuses a style of the
surface's own inside one. Polishing a surface is styling it, taking the mark off and landing its RFC.

**What a surface stands on is finished whatever its look**: how the console reads the platform,
writes to it and follows what it started -- the facets, the registry's catalog and resources, a
write and its task -- is built, tested and documented as polished code, since the look changes over
it and it does not.
