# Radzen MCP — Curated Usage Corpus (flagship enrichment)

**Date:** 2026-06-22
**Status:** approved (curated-corpus approach), ready to build

## Goal

Close the biggest gap vs the official Radzen MCP: give the agent the *structural,
compile-critical* Radzen patterns that reflection cannot see (setup, two-way
binding, validation linkage, DataGrid `LoadData`, theming, layout, services,
events, icons). Keep it offline and zero-dependency — a hand-authored corpus,
not a scraper.

## Approach

A small, curated set of **usage topics** shipped with the server, exposed via two
new MCP tools. Content is sourced from verified Radzen docs (see the research
report). No network, no scraping.

## Data model

```ts
interface UsageTopic {
  id: string;          // stable slug, e.g. "datagrid"
  title: string;
  summary: string;     // one line
  components: string[]; // related component names (for cross-linking)
  markdown: string;    // body with code examples
}
```

The corpus is a typed module (`server/src/usage/topics.ts`) compiled into `dist`
— no file IO or packaging concerns.

## Tools

| Tool | Returns |
|---|---|
| `list_usage_topics()` | `[{ id, title, summary, components }]` — the catalog |
| `get_usage(topic_id)` | the full topic markdown; unknown id → error with fuzzy "did you mean" suggestions |

## Topics (v1 of the corpus)

`setup`, `data-binding`, `validation`, `datagrid`, `events`, `layout`,
`theming`, `dialogs-notifications`, `icons`.

## Out of scope

Per-component scraped examples (fragile, network-dependent) — a possible later
pass. This corpus is the reliable, high-value core.

## Testing

- Each tool unit-tested against the corpus (catalog shape; lookup hit/miss with
  suggestions).
- A corpus integrity test: ids are unique, non-empty, and every referenced
  component name exists in the knowledge base.
