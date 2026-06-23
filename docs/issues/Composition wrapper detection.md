---
title: Composition wrapper detection
type: issue
status: deferred
category: feature
area: extractor
priority: low
created: 2026-06-23
tags: [radzen-mcp, issue, extractor, razor-parsing]
---

# Composition wrapper detection

**Status:** deferred · **Area:** extractor · **Priority:** low

## Context

A consumer component can **wrap** a Radzen component by rendering it internally
(e.g. a `MyButton.razor` that renders `<RadzenButton>`), without inheriting from
it. Unlike subclass wrappers (see [[Consumer component indexing]]), composition
wrappers are **invisible to reflection** — the relationship lives only in the
`.razor` markup.

## Goal

Record "this component wraps RadzenX" relationships so the tool can connect a
project's wrappers to the underlying Radzen components.

## Proposed approach

- Parse `.razor` markup (Razor AST via `Microsoft.AspNetCore.Razor.Language`, or
  a pragmatic element-tag scan) for child component tags.
- Cross-reference discovered tags against known component type names; emit a
  `wraps: [string]` field on the component.

## Risks

- Razor static parsing is harder than reflection (class-name/namespace inference,
  source-generator ordering). Pragmatic tag scanning is brittle but cheap.

## References

- `docs/superpowers/research/2026-06-22-examples-and-consumer-components.md`

## Acceptance

- A sample wrapper component records `wraps: ["RadzenButton"]`; surfaced in
  `get_component` / vault notes.

## Related

[[Consumer component indexing]] · back to [[Issues]]
