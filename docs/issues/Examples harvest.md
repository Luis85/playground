---
title: Examples harvest
type: issue
status: deferred
category: feature
area: extractor
priority: high
created: 2026-06-23
tags: [radzen-mcp, issue, extractor, examples]
---

# Examples harvest

**Status:** deferred · **Area:** extractor · **Priority:** high

## Context

Our knowledge base has component API (parameters, events, summaries) but **no
usage examples** — the one capability the official cloud Radzen MCP still has
over ours. Research concluded that scraping `blazor.radzen.com` is fragile (the
demo pages are WASM-hydrated), but the example source lives in the repo at
`radzenhq/radzen-blazor/RadzenBlazorDemos/Pages/*.razor` (~300+ files, **MIT**),
which is exactly what the site's "Edit Source" tab renders.

## Goal

Attach an `examples: [{ title, code }]` array to each component in
`component-knowledge.json`, sourced from the demos repo at the pinned tag, and
surface them in `get_component` and the Obsidian export.

## Proposed approach

- Add a harvest step (Node, network-only at regen time) that fetches
  `RadzenBlazorDemos/Pages/*.razor` (raw GitHub or contents API) at the pinned
  `Radzen.Blazor` version's tag.
- Map example files to components via the `<RadzenExample ComponentName="X"
  Example="Y">` attributes and filename prefixes.
- Merge `examples` into the KB (extend the zod schema with an optional
  `examples` field, default `[]`).
- Keep the upstream MIT license/notice with the harvested code.

## References

- `docs/superpowers/research/2026-06-22-examples-and-consumer-components.md`
- `docs/superpowers/research/2026-06-22-radzen-mcp-improvements.md` (item #6)

## Acceptance

- Most components have ≥1 example; `get_component` returns them; vault notes show
  an Examples section. Regen stays deterministic and license-clean.

## Related

[[Consumer component indexing]] · back to [[Issues]]
