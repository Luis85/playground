---
title: Structured tool output
type: issue
status: open
category: enhancement
area: server
priority: low
created: 2026-06-23
tags: [radzen-mcp, issue, server, mcp]
---

# Structured tool output

**Status:** open · **Area:** server · **Priority:** low

## Context

Every tool returns `content: [{ type: "text", text: JSON.stringify(...) }]`. The
MCP spec also supports `outputSchema` + `structuredContent`, letting capable
clients consume typed results without re-parsing text and validating tool calls.

## Goal

Add `outputSchema` + `structuredContent` to the data-returning tools
(`list_components`, `get_component`, `search_components`, `list_usage_topics`,
`list_templates`) while keeping the text payload as a fallback.

## Notes

- Most MCP clients today support only tools/text; this is additive and
  backward-compatible. Keep the text fallback.

## References

- `docs/superpowers/research/2026-06-22-radzen-mcp-improvements.md` (§3)
- MCP tools spec (2025-06-18).

## Acceptance

- The listed tools expose `outputSchema` and return matching `structuredContent`;
  existing text-only clients are unaffected.

## Related

[[Response format parity]] · back to [[Issues]]
