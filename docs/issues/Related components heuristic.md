---
title: Related components heuristic
type: issue
status: open
category: enhancement
area: obsidian
priority: low
created: 2026-06-23
tags: [radzen-mcp, issue, obsidian]
---

# Related components heuristic

**Status:** open · **Area:** obsidian · **Priority:** low

## Context

`relatedComponents` (Obsidian export) links any two components where one name is
a prefix of the other. In the real KB this over-links: `RadzenHtml` connects to
~32 `RadzenHtmlEditor*` toolbar buttons, and `RadzenDataGrid` to ~8 internal
cell/row sub-components. The "Related components" section gets noisy.

## Goal

Produce a tighter, more meaningful related-components set.

## Proposed approach

- Split names on PascalCase boundaries and require a shared prefix of ≥2 segments,
  or only link parent↔child where the longer name adds exactly one segment.
- Optionally cap the number of related links per note.

## Notes

- Reviewers rated this low priority (the links are "genuinely related, just
  noisy"). Cosmetic, not a correctness bug.

## References

- `server/src/obsidian.ts` (`relatedComponents`).

## Acceptance

- Toolbar/sub-component families no longer flood the Related section.

## Related

back to [[Issues]]
