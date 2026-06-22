# Radzen Blazor MCP

A local [MCP](https://modelcontextprotocol.io) server that gives a coding agent
accurate Radzen Blazor component knowledge, a markup-scaffolding tool, and an
Obsidian-compatible component library generator. See `docs/superpowers/specs/`
for the design, `docs/adr/` for key decisions, and `CONTEXT.md` for the glossary.

## Layout

- `server/` — TypeScript/Node MCP server (stdio). Needs only Node 20+.
- `extractor/` — .NET tool that reflects `Radzen.Blazor` into `component-knowledge.json` (needs the .NET 8 SDK; run in CI).
- `component-knowledge.json` — committed knowledge base (215 components, Radzen 5.9.9); the contract between extractor and server.

## Quick start

```sh
cd server && npm install && npm run build
```

Register the server with an MCP client. This repo ships a project-scoped
[`.mcp.json`](./.mcp.json) (picked up by Claude Code and other clients when you
open the repo). To register manually with Claude Code:

```sh
claude mcp add radzen-blazor -- node "$PWD/server/dist/server.js"
```

Or point any MCP client at the built entrypoint (Node resolves dependencies and
the knowledge base from the file's location, so the client's working directory
doesn't matter):

```json
{
  "mcpServers": {
    "radzen-blazor": {
      "command": "node",
      "args": ["/absolute/path/to/repo/server/dist/server.js"]
    }
  }
}
```

Before the knowledge base exists (or to use a different one), set `RADZEN_KB_PATH`.

## Tools

| Tool | Description |
|---|---|
| `list_components(filter?)` | Component names + one-line summaries; optional substring filter. |
| `get_component(name, response_format?)` | Full API (parameters, events). `response_format: "concise"` returns names only; `"detailed"` (default) returns full metadata. Unknown names get "did you mean" suggestions. |
| `search_components(query)` | Typo-tolerant fuzzy search over names, parameter names, and descriptions. |
| `scaffold_component(name, options?)` | Ready-to-paste Razor markup; option keys validated against the component's parameters **and** events; values are HTML-escaped. |
| `export_obsidian_library(output_dir)` | Generate an Obsidian vault of the whole component library (see below). |

> Note: `summary`/`description` fields are sourced from Radzen's published docs
> and may be empty in the current build (reflection yields API shape; see
> `docs/adr/0001`). Search still matches component and parameter names.

## Obsidian component library

Generate a browsable [Obsidian](https://obsidian.md) vault — one note per
component with YAML frontmatter (title, aliases, version, parameter/event
counts, tags), parameter/event tables, `[[wikilinks]]` between related
components, and a `Radzen Components` index/MOC note.

Via the MCP tool: `export_obsidian_library({ output_dir: "/path/to/vault" })`.

Via the CLI:

```sh
cd server
RADZEN_KB_PATH=../component-knowledge.json npm run export:obsidian -- /path/to/vault
```

Open the output folder as an Obsidian vault to browse the library with graph
view and backlinks.

## Test the server

```sh
cd server && npm test
```

## Generate / regenerate the knowledge base

Runs in CI on a `Radzen.Blazor` version bump (Renovate opens the PR); to do it
locally you need the .NET 8 SDK and network access to restore the package:

```sh
cd extractor && dotnet run -- ../component-knowledge.json
```

Commit the updated `component-knowledge.json`.
