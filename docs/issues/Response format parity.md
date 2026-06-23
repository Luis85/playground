---
title: Response format parity
type: issue
status: open
category: enhancement
area: server
priority: low
created: 2026-06-23
tags: [radzen-mcp, issue, server, tokens]
---

# Response format parity

**Status:** open · **Area:** server · **Priority:** low

## Context

`get_component` supports `response_format: concise | detailed`. `search_components`
is always concise (`{ name, summary }`) and `list_components` is always
`{ name, summary }` with a `limit`. The token-control story is therefore
half-built and slightly inconsistent across the read tools.

## Goal

Make output shaping consistent and predictable across read tools.

## Proposed approach

- Either add `response_format` to `search_components` / `list_components` (e.g. a
  `detailed` mode that includes parameter names), or explicitly document that
  search/list are always concise by design and `get_component` is the detail
  path.
- Decide once and reflect it in tool descriptions.

## References

- `docs/superpowers/research/2026-06-22-radzen-mcp-improvements.md` (§3)

## Acceptance

- Read tools have a documented, consistent output-size contract.

## Related

[[Structured tool output]] · [[Offline semantic search]] · back to [[Issues]]
