# Issues: status

What the status page leaves open. The rules over an entry are the index's; see
[issues.md](issues.md).

## The status page is on the kit, not the design system

The status page imports `@canmi/kit/theme/palettes/mono.css` and the kit's `interaction.css`, and
reads the kit's `--color-*` names, while the console and space read `@canmi/design`'s contract. The
kit is frozen and marked for deprecation -- lib's `pkgs/kit/README.md` -- so the status page carries
it as debt: nothing of it is changed while the design system is being built, and it moves onto the
system once the system is settled, as the site and the CMS will -- [site.md](site.md),
[cms.md](cms.md).

**What deciding it would cost.** Its own tokens renamed onto the contract and its look checked
against mono's, as each console page was; nothing it does depends on the kit beyond its colors and
its focus ring.
