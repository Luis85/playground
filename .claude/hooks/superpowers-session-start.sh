#!/usr/bin/env bash
# SessionStart hook for vendored Superpowers skills (project-level install).
#
# Injects the `using-superpowers` skill at session start so the agent knows to
# reach for skills before acting. Adapted from obra/Superpowers hooks/session-start
# to run as a Claude Code *project* hook (no CLAUDE_PLUGIN_ROOT), resolving the
# skills path relative to this script's location.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
CLAUDE_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

using_superpowers_content=$(cat "${CLAUDE_DIR}/skills/using-superpowers/SKILL.md" 2>&1 || echo "Error reading using-superpowers skill")

# Escape string for JSON embedding via bash parameter substitution (fast, no jq).
escape_for_json() {
    local s="$1"
    s="${s//\\/\\\\}"
    s="${s//\"/\\\"}"
    s="${s//$'\n'/\\n}"
    s="${s//$'\r'/\\r}"
    s="${s//$'\t'/\\t}"
    printf '%s' "$s"
}

using_superpowers_escaped=$(escape_for_json "$using_superpowers_content")
session_context="<EXTREMELY_IMPORTANT>\nYou have superpowers.\n\n**Below is the full content of your 'using-superpowers' skill - your introduction to using skills. For all other skills, use the 'Skill' tool:**\n\n${using_superpowers_escaped}\n</EXTREMELY_IMPORTANT>"

# Claude Code reads hookSpecificOutput.additionalContext for SessionStart.
# printf (not heredoc) avoids a bash 5.3+ heredoc hang.
printf '{\n  "hookSpecificOutput": {\n    "hookEventName": "SessionStart",\n    "additionalContext": "%s"\n  }\n}\n' "$session_context"

exit 0
