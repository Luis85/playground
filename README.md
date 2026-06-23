# Radzen Blazor MCP

A **local, offline** [MCP](https://modelcontextprotocol.io) server that gives your
coding agent accurate, up-to-date knowledge of the [Radzen Blazor](https://blazor.radzen.com)
component library — so it writes correct markup instead of guessing.

It exposes the real API of **215 Radzen components** (parameters, events, type
parameters, defaults, and docs), curated usage guides for the patterns reflection
can't show, ready-made templates, and an Obsidian library export. No API key, no
network calls at runtime, no cost.

- ✅ **Accurate** — the component API is reflected directly from the `Radzen.Blazor`
  assembly, so it can't drift from reality.
- ✅ **Offline & private** — runs over stdio, reads a committed knowledge base; nothing leaves your machine.
- ✅ **Free** — no subscription or key.

---

## Contents

- [Prerequisites](#prerequisites)
- [Install](#install)
- [Connect your agent](#connect-your-agent) (Claude Code · Cursor · VS Code · generic)
- [Verify](#verify)
- [Tools](#tools)
- [Using it](#using-it) — the recommended workflow + examples
- [Obsidian library](#obsidian-library)
- [Troubleshooting](#troubleshooting)
- [Maintaining the knowledge base](#maintaining-the-knowledge-base)
- [Project layout](#project-layout)
- [Roadmap & license](#roadmap--license)

---

## Prerequisites

- **Node.js 20+** (for the server — this is all you need to use it).
- An **MCP-capable client**: Claude Code, Cursor, VS Code (Copilot), or any client that speaks MCP over stdio.
- *(Only to regenerate the knowledge base)* the **.NET 8 SDK** — not needed for normal use; CI handles regeneration.

## Install

```sh
git clone <this-repo> && cd <this-repo>
cd server
npm install
npm run build      # compiles to server/dist (required before launch)
cd ..
```

The server launches from `server/dist/server.js`, so **`npm run build` is a prerequisite**.

## Connect your agent

Point your client at the built entrypoint. Using an **absolute path** is the most
robust form — Node resolves both its dependencies and the bundled knowledge base
from the file's own location, so the client's working directory doesn't matter.

**Claude Code** — one command (run from anywhere):

```sh
claude mcp add radzen-blazor -- node "/absolute/path/to/repo/server/dist/server.js"
```

…or use the project-scoped [`.mcp.json`](./.mcp.json) shipped in this repo (auto-detected
when you open the repo in Claude Code). Note its path is **relative to the repo root**,
so launch the client from there, or switch it to an absolute path.

**Cursor** — add to `~/.cursor/mcp.json` (global) or `.cursor/mcp.json` (project):

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

**VS Code (Copilot)** — add to `.vscode/mcp.json`:

```json
{
  "servers": {
    "radzen-blazor": {
      "command": "node",
      "args": ["/absolute/path/to/repo/server/dist/server.js"]
    }
  }
}
```

**Any other MCP client** — run `node /absolute/path/to/repo/server/dist/server.js`
as a **stdio** server with the same JSON shape as above.

> To point the server at a different knowledge base, set the `RADZEN_KB_PATH`
> environment variable to a `component-knowledge.json` path.

## Verify

After registering, restart/reload your client and confirm the `radzen-blazor`
tools appear (e.g. `list_components`, `get_component`). A quick check from your
agent: *"List Radzen components matching 'grid'."* You should get
`RadzenDataGrid`, `RadzenDataGridColumn`, ….

To smoke-test the server directly:

```sh
cd server && npm test          # 60+ unit tests
RADZEN_KB_PATH=../component-knowledge.json npm start   # starts on stdio (Ctrl-C to stop)
```

---

## Tools

| Tool | What it does |
|---|---|
| `list_components(filter?, limit?)` | Component names + one-line summaries. Optional substring `filter`; `limit` defaults to 50. |
| `search_components(query, limit?)` | Typo-tolerant fuzzy search over names, parameter names, and descriptions. Returns concise `{name, summary}`; `limit` defaults to 10. |
| `get_component(name, response_format?)` | Full API: parameters (type/default/description), events, type parameters, plus ids of related usage guides. `response_format`: `"detailed"` (default) or `"concise"` (names only). Unknown names get *"did you mean"* suggestions. |
| `scaffold_component(name, options?)` | Ready-to-paste Razor markup for one component. Option keys are validated against the component's parameters, events, generic type parameters, `@bind-<param>`, Razor directives (`@rendermode`/`@ref`/…), and pass-through HTML attributes (`class`/`id`/`aria-*`) on catch-all components. Literal values are HTML-escaped; `@`-expressions are kept verbatim. |
| `list_usage_topics()` / `get_usage(topic_id)` | Curated, verified usage guides for the structural patterns reflection can't show: `setup`, `data-binding`, `validation`, `datagrid`, `events`, `layout`, `theming`, `dialogs-notifications`, `icons`. |
| `list_templates()` / `scaffold_template(template_id, options?)` | Whole-pattern scaffolds: `form` (validated `RadzenTemplateForm`), `datagrid`, `layout` (app shell), `dashboard` (card grid). Options fill in type/handler/title; omitted options use sensible defaults. |
| `export_obsidian_library(output_dir)` | Write the whole component library as an Obsidian vault (see [below](#obsidian-library)). |

> Component/parameter `summary`/`description` come from Radzen's published XML docs
> and are populated for most components (a minority may be blank); search still
> matches names. See [`docs/adr/0001`](./docs/adr/0001-reflect-assembly-over-scraping.md).

## Using it

You don't call these tools by hand — your agent does, while writing Radzen code.
Once connected, just ask for Radzen UI in natural language; the agent uses the
tools to stay accurate. The intended flow:

1. **Discover** — `search_components` / `list_components` to find the right component.
2. **Learn the API** — `get_component` for exact parameter/event names (it also points to relevant usage guides).
3. **Learn the pattern** — `get_usage(topic)` for binding/validation/DataGrid/etc.
4. **Generate** — `scaffold_component` for a single tag, or `scaffold_template` for a whole form/grid/layout/dashboard.

**Example prompts to your agent**

- *"Add a Radzen data grid bound to `employees` with paging and sorting."*
  → `get_usage("datagrid")` + `scaffold_template("datagrid", { item_type: "Employee", data: "employees" })`.
- *"Make a validated Radzen form for a `Customer` model."*
  → `scaffold_template("form", { item_type: "Customer" })`.
- *"What events does `RadzenDropDown` expose?"* → `get_component("RadzenDropDown")`.
- *"How do I wire up Radzen dialogs?"* → `get_usage("dialogs-notifications")`.

**Example tool calls**

```jsonc
// Exact API for a component
get_component({ "name": "RadzenButton" })

// One component, with attributes (events & bindings welcome)
scaffold_component({
  "name": "RadzenButton",
  "options": { "Text": "Save", "ButtonStyle": "ButtonStyle.Primary", "Click": "@OnSave" }
})
// → <RadzenButton Text="Save" ButtonStyle="ButtonStyle.Primary" Click="@OnSave" />

// A whole validated form
scaffold_template({ "template_id": "form", "options": { "item_type": "Customer" } })
```

## Obsidian library

Generate a browsable [Obsidian](https://obsidian.md) vault — one note per
component (YAML frontmatter, parameter/event tables, `[[wikilinks]]` to related
components and usage guides), one note per usage guide, and a `Radzen Components`
index/MOC.

```sh
# Via the CLI
cd server
RADZEN_KB_PATH=../component-knowledge.json npm run export:obsidian -- /path/to/vault
```

…or ask your agent to call `export_obsidian_library({ output_dir: "/path/to/vault" })`.
Open the output folder as a vault to explore with graph view and backlinks.

## Troubleshooting

| Symptom | Fix |
|---|---|
| Client shows no `radzen-blazor` tools | Ensure `npm run build` ran (the entry is `server/dist/server.js`), the path in your config is correct (prefer absolute), then reload the client. |
| `Could not read knowledge base …` on startup | The server looks for `component-knowledge.json` next to the entrypoint then at the repo root. Set `RADZEN_KB_PATH` to an explicit path. |
| Using the project `.mcp.json` and it can't find the server | Its path is repo-root-relative; start the client from the repo root or switch to an absolute path. |
| `get_component` says "unknown component" | Names are case-insensitive but must be exact otherwise; use `search_components` or the "did you mean" hint. |

## Maintaining the knowledge base

`component-knowledge.json` (215 components, Radzen 5.9.9) is the committed contract
between the .NET extractor and the server. It's regenerated automatically: **Renovate**
watches the `Radzen.Blazor` NuGet package and opens a bump PR, and a **GitHub Actions**
workflow runs the extractor, validates the output against the server's schema, and
commits the refreshed KB.

To regenerate locally (needs the .NET 8 SDK + network):

```sh
cd extractor && dotnet run -- ../component-knowledge.json
```

> Publishing the npm package must run `prepack` (it builds and bundles the KB into
> `dist`); `npm publish --ignore-scripts` would ship without the knowledge base.

## Project layout

```
server/                 TypeScript/Node MCP server (stdio) — needs only Node 20+
  src/                  tools, knowledge loader, search, scaffolding, obsidian export
  test/                 unit + in-process handler tests
extractor/              .NET tool: reflects Radzen.Blazor -> component-knowledge.json
component-knowledge.json  committed knowledge base (the contract)
.mcp.json               project-scoped MCP server registration
docs/                   ADRs, specs, plans, research, and the issue backlog
CONTEXT.md              project glossary (ubiquitous language)
```

## Roadmap & license

Planned work and known limitations live as Obsidian-friendly notes under
[`docs/issues/`](./docs/issues/) (examples harvest, consumer-component indexing,
offline semantic search, an eval harness, and more).

The vendored example/usage content derives from the **MIT-licensed**
[`radzenhq/radzen-blazor`](https://github.com/radzenhq/radzen-blazor) project.
See `docs/` for design decisions (`docs/adr/`) and the glossary (`CONTEXT.md`).
