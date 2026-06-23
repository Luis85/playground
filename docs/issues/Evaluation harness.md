---
title: Evaluation harness
type: issue
status: open
category: enhancement
area: testing
priority: medium
created: 2026-06-23
tags: [radzen-mcp, issue, testing, eval]
---

# Evaluation harness

**Status:** open · **Area:** testing · **Priority:** medium

## Context

We have 62 unit tests, but no end-to-end measure of whether an agent using the
MCP actually produces **correct, compiling** Radzen markup. Anthropic's
tool-writing guidance recommends realistic agentic eval loops.

## Goal

Measure and track how well the tools help an agent generate valid Radzen code.

## Proposed approach

- Define realistic tasks ("build a paged DataGrid bound to Employee", "a
  validated form").
- Run an agentic loop that calls the tools; capture tool-call count, tokens,
  errors.
- Validate generated markup — at minimum lint/parse; ideally compile a tiny
  Blazor project in CI containing the generated snippet.
- Use results to tune tool descriptions/outputs.

## References

- `docs/superpowers/research/2026-06-22-radzen-mcp-improvements.md` (item #10)
- Anthropic "writing tools for agents".

## Acceptance

- A repeatable eval reporting pass/fail + tool-call/token metrics on a fixed task
  set.

## Related

[[Structured tool output]] · back to [[Issues]]
