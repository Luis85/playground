# Radzen Blazor MCP — Design (v1)

**Date:** 2026-06-22
**Status:** approved, ready for implementation planning

## Goal

A local MCP server that lets a coding agent write correct Radzen Blazor markup.
Retrieval of accurate component knowledge is the foundation; a scaffolding tool
sits on top of it. See `CONTEXT.md` for the ubiquitous language and
`docs/adr/0001-reflect-assembly-over-scraping.md` for the knowledge-source
decision.

## Scope

- **Target:** the open-source Radzen Blazor component library (`Radzen.Blazor`).
- **In:** retrieval of all ~90 components' parameters/events/descriptions, plus a
  generic scaffolding tool.
- **Out (v1):** Radzen Blazor Studio, the legacy Angular tooling, usage examples,
  semantic/embedding search, live network calls at runtime.

## Architecture

Two parts bridged by a committed JSON file:

```
.NET extractor ──reflects──► Radzen.Blazor assembly
   (build tool)                      │
                                     ▼
                      component-knowledge.json   (committed)
                                     │
                                     ▼
   TypeScript/Node MCP server ──reads JSON, no .NET at runtime──► 4 tools (stdio)
```

### Components

1. **`extractor/`** — .NET console tool. Loads the `Radzen.Blazor` assembly,
   enumerates public component types, and for each emits: class name, summary,
   `[Parameter]` properties (name, type, default, description), and
   `EventCallback`s. Writes `component-knowledge.json`. Run manually or in CI on a
   Radzen version bump. The only component that depends on .NET.

2. **`component-knowledge.json`** — committed knowledge base; the contract between
   extractor and server. Shape (illustrative):

   ```json
   {
     "radzenVersion": "x.y.z",
     "components": [
       {
         "name": "RadzenButton",
         "summary": "A button component.",
         "parameters": [
           { "name": "Text", "type": "string", "default": "\"\"", "description": "..." }
         ],
         "events": [
           { "name": "Click", "type": "EventCallback<MouseEventArgs>", "description": "..." }
         ]
       }
     ]
   }
   ```

3. **`server/`** — TypeScript/Node MCP server using `@modelcontextprotocol/sdk`,
   **stdio** transport. Loads the JSON once at startup into an in-memory index and
   exposes the tools below. No .NET, no network at runtime.

### Tools

| Tool | Input | Output |
|---|---|---|
| `list_components` | `filter?` (substring over name/summary) | array of `{ name, summary }` |
| `get_component` | `name` | full component record (parameters, events, summary) |
| `search_components` | `query` | components matching name, parameter name, or description (case-insensitive substring) |
| `scaffold_component` | `name`, `options` (attr → value) | `<RadzenX .../>` markup string; options validated against the component's known parameters, unknown options rejected |

## Data flow

- **Build time:** `extractor` → `component-knowledge.json` (committed).
- **Runtime:** client → MCP tool call → server reads in-memory index → result.
  `scaffold_component` additionally validates options against the indexed
  parameters before emitting markup.

## Error handling

- `get_component` / `scaffold_component` with an unknown component name → MCP tool
  error naming the component (and, for scaffold, suggesting `list_components`).
- `scaffold_component` with an option not in the component's parameters → error
  listing the invalid option(s) and the valid parameter names.
- Server fails fast at startup if `component-knowledge.json` is missing or
  malformed.

## Testing

- **Extractor:** unit-test the reflection mapping against a small known type;
  assert the emitted JSON shape.
- **Server:** unit-test each tool against a fixture `component-knowledge.json`
  (lookup hit/miss, search matching, scaffold markup + option validation).
- **Contract:** a schema check that the committed JSON matches the shape the
  server expects.

## Repo layout (proposed)

```
/
├── CONTEXT.md
├── component-knowledge.json
├── docs/adr/0001-reflect-assembly-over-scraping.md
├── extractor/            # .NET console tool
└── server/               # TypeScript/Node MCP server
```

## Next step

Invoke `writing-plans` to turn this into a step-by-step implementation plan.
