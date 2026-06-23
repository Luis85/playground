---
title: Scaffold Razor expression quoting
type: issue
status: accepted
category: limitation
area: server
priority: low
created: 2026-06-23
tags: [radzen-mcp, issue, server, scaffold]
---

# Scaffold Razor expression quoting

**Status:** accepted (known limitation) · **Area:** server · **Priority:** low

## Context

`scaffold_component` leaves Razor expression values (those starting with `@`)
**unescaped** so they stay valid C# — e.g. `Click="@(() => Save())"` is emitted
verbatim. Literal values are HTML-escaped. This was a deliberate fix: the prior
behavior HTML-escaped everything and corrupted Razor expressions
(`@(() =&gt; ...)`, `&amp;&amp;`).

## Limitation

A Razor expression value that itself contains a double quote — e.g.
`@(s == "a")` — is emitted verbatim into a `="..."` attribute, producing
`Click="@(s == "a")"`, which breaks the attribute quoting. There is no general
fix because Razor expressions legitimately need unescaped quotes, and a `.razor`
parser treats `@(...)` differently from HTML.

## Decision

Accepted. Scaffolding output is a starting point the developer edits; the common
cases (`@OnClick`, simple lambdas) work. Revisit only if it proves painful in
practice (e.g. emit such values with single-quoted attributes, or as a child
`@code` snippet).

## References

- `server/src/tools/scaffoldComponent.ts`
- Reviewer note (P3) from the review pass.

## Related

back to [[Issues]]
