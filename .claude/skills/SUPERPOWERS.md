# Superpowers (vendored)

These skills are vendored from [obra/Superpowers](https://github.com/obra/Superpowers),
a composable skills library for coding agents (TDD, systematic debugging,
brainstorming, planning, code review, git worktrees, etc.).

- **Source:** https://github.com/obra/Superpowers
- **Version:** 6.0.3 (commit `896224c`)
- **License:** MIT (Jesse Vincent)

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

## Updating

```sh
git clone --depth 1 https://github.com/obra/Superpowers.git /tmp/Superpowers
rm -rf .claude/skills/*/        # keep this file
cp -R /tmp/Superpowers/skills/. .claude/skills/
# then bump the version/commit recorded above
```
