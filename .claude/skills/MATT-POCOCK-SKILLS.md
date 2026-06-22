# Matt Pocock skills (vendored)

Vendored from [mattpocock/skills](https://github.com/mattpocock/skills) to enable
the **`grill-with-docs`** workflow in this repo.

- **Source:** https://github.com/mattpocock/skills
- **Commit:** `6eeb81b`
- **License:** MIT (Matt Pocock) — full notice in [MATT-POCOCK-SKILLS.LICENSE](./MATT-POCOCK-SKILLS.LICENSE)

## What's installed and why

`grill-with-docs` is a thin orchestrator — it runs a `grilling` session using the
`domain-modeling` skill — so its dependencies are installed alongside it:

| Skill | Role |
|-------|------|
| `grill-with-docs` | Relentless interview to sharpen a plan/design while producing docs (ADRs + glossary). User-invoked only (`disable-model-invocation: true`). |
| `grilling` | The interview engine: one question at a time, recommended answer each time, explores the codebase when it can. |
| `domain-modeling` | Maintains the domain model — writes the glossary (`CONTEXT.md`) and ADRs (`docs/adr/`) as decisions crystallise. Uses `ADR-FORMAT.md` and `CONTEXT-FORMAT.md`. |

## Repo preparation

- `docs/adr/` holds the Architecture Decision Records. `domain-modeling` creates
  `CONTEXT.md` (the glossary) lazily at the repo root the first time a term is
  resolved — it is intentionally not pre-created.

## Usage

Invoke `grill-with-docs` (e.g. `/grill-with-docs`) when you want to stress-test a
plan before building — for example, the upcoming Radzen local-MCP design.

## Updating

```sh
git clone --depth 1 https://github.com/mattpocock/skills.git /tmp/mp
cp -RT /tmp/mp/skills/engineering/grill-with-docs .claude/skills/grill-with-docs
cp -RT /tmp/mp/skills/productivity/grilling        .claude/skills/grilling
cp -RT /tmp/mp/skills/engineering/domain-modeling  .claude/skills/domain-modeling
# then bump the commit recorded above
```
