---
title: Consumer component indexing
type: issue
status: deferred
category: feature
area: extractor
priority: high
created: 2026-06-23
tags: [radzen-mcp, issue, extractor, reflection]
---

# Consumer component indexing

**Status:** deferred · **Area:** extractor · **Priority:** high

## Context

Today the tool only knows Radzen's components. Projects building on Radzen have
their **own** components and often **subclass** Radzen components. The extractor's
reflection approach is library-agnostic (everything derives from `ComponentBase`
+ `[Parameter]`), so a consumer's assembly can be indexed into the same KB —
turning this into "**your project's** Blazor component MCP." No existing MCP does
this.

## Goal

Reflect a consumer's built assembly (their custom components + Radzen subclass
wrappers) into a merged `component-knowledge.json`, tagged by provenance.

## Proposed approach

- Generalize the extractor to accept multiple sources (the pinned `Radzen.Blazor`
  package + one or more consumer assemblies/projects), via config or args.
- Load consumer assemblies with **`MetadataLoadContext`** (reflection-only — no
  code execution, no version conflicts).
- Add KB fields: `library` (provenance) and `baseComponent` (for subclass
  wrappers, detected via `Type.BaseType`/`IsSubclassOf`).
- Server tools already operate generically; add `list_components(library?)`
  filtering and show `library`/`baseComponent` in `get_component`.

## Constraints

- The consumer must run the extractor (needs the .NET SDK). The published npm
  server stays zero-dependency: it ships the Radzen KB; a consumer regenerates a
  merged KB locally.

## References

- `docs/superpowers/research/2026-06-22-examples-and-consumer-components.md`

## Acceptance

- Pointing the extractor at a sample project indexes its components + Radzen
  subclass wrappers into one KB; tools work across libraries.

## Related

[[Composition wrapper detection]] · [[Examples harvest]] · back to [[Issues]]
