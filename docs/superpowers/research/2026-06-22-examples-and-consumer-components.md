# Examples Harvest & Consumer-Component Indexing — Research & Design

**Date:** 2026-06-22
**Status:** investigation + proposed architecture (not yet built)

Two evolutions for the Radzen Blazor MCP:
1. Add real per-component **usage examples** (the official MCP's remaining edge).
2. Grow from "Radzen library MCP" → "**your project's Blazor component MCP**":
   index the consumer's own components and their Radzen wrappers too.

## 1. Examples: harvest the repo, don't scrape the site

- blazor.radzen.com demo pages are **WASM-hydrated**; example code is not in the
  HTML — scraping is fragile and ToS-ambiguous.
- Example source lives in the repo at **`RadzenBlazorDemos/Pages/*.razor`**
  (~300+ files, **MIT**), the exact source the site's "Edit Source" tab renders.
  Mapping component→examples comes from `<RadzenExample ComponentName="X"
  Example="Y">` attributes and filename prefixes.
- **Plan:** at the pinned tag, fetch `RadzenBlazorDemos/Pages/*.razor` (raw
  GitHub or contents API), group by component, attach an `examples: [{ title,
  code }]` array to each component in the knowledge base. MIT requires keeping
  the upstream license/notice with the harvested code.

Refs: repo `https://github.com/radzenhq/radzen-blazor` (`RadzenBlazorDemos/Pages/`),
raw fetch `https://raw.githubusercontent.com/radzenhq/radzen-blazor/master/RadzenBlazorDemos/Pages/ButtonPage.razor`,
LICENSE (MIT) `https://github.com/radzenhq/radzen-blazor/blob/master/LICENSE`.

## 2. Consumer / custom / wrapper components

The extractor reflection approach is library-agnostic — everything derives from
`ComponentBase` + `[Parameter]`. So we can index any assembly.

- **Custom components:** `.razor` compiles to a class (name = filename,
  namespace = root + folder). Reflect the consumer's built assembly.
- **Subclass wrappers** (`MyButton : RadzenButton`): reflection exposes inherited
  `[Parameter]`s; detect via `Type.BaseType`/`IsSubclassOf` and tag `extends`.
- **Composition wrappers** (render `RadzenButton` internally, no inheritance):
  invisible to reflection — requires parsing `.razor` markup for child component
  tags. Optional later phase.
- **Safety:** load consumer assemblies with **`MetadataLoadContext`** (reflection
  only, no code execution, no version conflicts).
- **Config:** point the extractor at one or more sources — a built `.dll`, or a
  `.csproj` to build then resolve `bin/<config>/<tfm>/*.dll`.

Refs: reflection technique `https://andrewlock.net/finding-all-routable-components-in-a-webassembly-app/`,
Razor class naming `https://learn.microsoft.com/en-us/aspnet/core/blazor/components/`,
extend/wrap `https://blog.danskingdom.com/Inherit-and-extend-a-Blazor-component-and-add-UI-elements-and-hijack-its-parameters/`.

## Proposed knowledge-base schema additions (backward-compatible)

All optional with defaults so existing tools/KB keep working:

```jsonc
{
  "name": "RadzenButton",
  "library": "Radzen.Blazor",        // provenance (assembly / "project")
  "baseComponent": null,              // e.g. "RadzenButton" for a subclass wrapper
  "examples": [                       // harvested usage examples (Radzen)
    { "title": "Filled", "code": "<RadzenButton ... />" }
  ],
  // ...existing: summary, typeParameters, parameters, events
}
```

Server impact is small — tools already operate generically over the KB:
- `get_component` surfaces `examples`, `library`, `baseComponent`.
- `list_components(library?)` / `search_components` filter or span libraries.
- Obsidian export gains an Examples section and groups notes by library.

## Extractor evolution

- Accept **multiple sources** (config or args): the pinned `Radzen.Blazor`
  package plus consumer assemblies/projects.
- Reflect each via `MetadataLoadContext`, tag `library`, detect `baseComponent`.
- For Radzen, additionally harvest examples from the demos repo at the pinned tag.
- Emit one merged `component-knowledge.json`.

## Recommended phasing

- **Phase A — Radzen examples (contained, high value).** Repo-source harvest →
  `examples` per Radzen component. Closes the last gap vs the official MCP; can be
  a Node enrichment step (testable locally; network only at regen time).
- **Phase B — Consumer component indexing (the differentiator).** Generalize the
  extractor to reflect a consumer assembly; add `library` + `baseComponent`;
  index custom + subclass-wrapper components into the same KB and tools.
- **Phase C — Composition-wrapper detection (optional).** Parse `.razor` markup to
  record "wraps RadzenX" relationships.

Each phase is independently shippable and warrants its own spec + plan.

## Open questions for the consumer-indexing phase

- Distribution: a consumer running our extractor against their project needs the
  .NET SDK — acceptable for that audience, but the published npm server stays
  zero-dep (ships the Radzen KB; consumer regenerates a merged KB locally).
- Config format and whether to auto-discover the project's `.csproj`.
- Whether examples for custom components are in scope (likely not — no doc source).
