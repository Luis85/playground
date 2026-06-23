---
title: Offline semantic search
type: issue
status: open
category: enhancement
area: server
priority: medium
created: 2026-06-23
tags: [radzen-mcp, issue, server, search]
---

# Offline semantic search

**Status:** open · **Area:** server · **Priority:** medium

## Context

`search_components` uses Fuse.js fuzzy/lexical matching. It is typo-tolerant but
not *semantic* — a query like "data table" won't surface `RadzenDataGrid` unless
the wording overlaps. The official MCP advertises semantic doc search.

## Goal

Add semantic retrieval while keeping the server **offline and zero-API-key**.

## Proposed approach

- Generate embeddings for component name + summary + parameter descriptions
  (+ examples once [[Examples harvest]] lands) at build time.
- Store/query with `sqlite-vec` (zero-dependency, single-file, brute-force KNN —
  fine for a few hundred components), or rank server-side and expose a `tokens`
  budget knob (Context7 pattern).
- Keep Fuse.js as the fast lexical path; blend or expose both.

## References

- `docs/superpowers/research/2026-06-22-radzen-mcp-improvements.md` (item #9)

## Acceptance

- "data table" → `RadzenDataGrid` in top results; no network/API key at runtime;
  bounded token output.

## Related

[[Response format parity]] · back to [[Issues]]
