# Superpowers (vendored)

These skills are vendored from [obra/Superpowers](https://github.com/obra/Superpowers),
a composable skills library for coding agents (TDD, systematic debugging,
brainstorming, planning, code review, git worktrees, etc.).

- **Source:** https://github.com/obra/Superpowers
- **Version:** 6.0.3 (commit `896224c`)
- **License:** MIT (Jesse Vincent) — full notice in [SUPERPOWERS.LICENSE](./SUPERPOWERS.LICENSE)

## Why vendored instead of `/plugin install`

Superpowers is normally a *global* Claude Code plugin installed via
`/plugin install superpowers@claude-plugins-official`. That install is per-agent
and does not live in the repo, so it does not persist in ephemeral / web sessions.
Claude Code also cannot force-enable a plugin from project `settings.json`
(`enabledPlugins` is managed-settings only).

To make Superpowers available to anyone using this repo — including Claude Code on
the web — the skills are vendored into `.claude/skills/` (auto-discovered by the
`Skill` tool, no install needed) and the `using-superpowers` primer is injected at
session start via a project `SessionStart` hook.

## Wiring

- `.claude/skills/<name>/SKILL.md` — the 14 skills, auto-discovered.
- `.claude/hooks/superpowers-session-start.sh` — adapted from the upstream
  `hooks/session-start`; emits the `using-superpowers` primer as
  `hookSpecificOutput.additionalContext`.
- `.claude/settings.json` — registers the SessionStart hook.

## Local integration layer (do not clobber on update)

This repo weaves Superpowers together with the `grilling` / `domain-modeling`
skills (see [MATT-POCOCK-SKILLS.md](./MATT-POCOCK-SKILLS.md)). Two pieces are
**local additions/edits**, not vendored upstream:

- `integrated-workflow/` — local bridge skill (the lifecycle map + auto-invocation rules).
- `using-superpowers/SKILL.md` — has a local "Integrated Pipeline" section added
  after "Platform Adaptation".

A naive re-vendor would overwrite the primer edit and (with `rm -rf`) delete the
bridge skill. Preserve both when updating.

## Updating

```sh
git clone --depth 1 https://github.com/obra/Superpowers.git /tmp/Superpowers
# Refresh only the vendored skills; keep local additions:
for d in /tmp/Superpowers/skills/*/; do
  name=$(basename "$d")
  # Replace the dir outright; cp -R into an existing dir would nest it
  # as .claude/skills/$name/$name/...
  rm -rf ".claude/skills/$name" && cp -RT "$d" ".claude/skills/$name"
done
# Re-apply the "Integrated Pipeline" section to using-superpowers/SKILL.md
# (it gets overwritten above), then bump the version/commit recorded above.
```
