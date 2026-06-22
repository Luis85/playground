# Radzen Blazor MCP

The ubiquitous language for this project: a local MCP server that gives a coding
agent accurate knowledge of the Radzen Blazor component library, plus a tool to
scaffold component markup.

## Language

**Radzen**:
In this project, the open-source Radzen Blazor *component library*
(`radzenhq/radzen-blazor`, the `Radzen.Blazor` NuGet package) — not Radzen
Blazor Studio or the legacy Angular tooling.
_Avoid_: Radzen Studio, Radzen.com

**Component**:
A single Radzen Blazor UI element (e.g. `RadzenDataGrid`, `RadzenButton`),
identified by its class name and described by its parameters and events.

**Parameter**:
A `[Parameter]`-annotated property on a component — its public, settable API
surface (name, type, default value, description).
_Avoid_: Prop, attribute, option

**Event**:
An `EventCallback` exposed by a component (e.g. `Click`, `RowSelect`).
_Avoid_: Handler, callback

**Extractor**:
The .NET console tool that reflects the `Radzen.Blazor` assembly and emits the
knowledge base. The only part of the system that depends on .NET.
_Avoid_: Generator, scraper, parser

**Knowledge base**:
`component-knowledge.json` — the committed file describing every component's
parameters and events. The contract between the extractor and the server.
_Avoid_: Database, index, cache

**Server**:
The TypeScript/Node MCP server that loads the knowledge base and exposes the
tools over stdio. Has no .NET dependency at runtime.

**Scaffold**:
To emit ready-to-paste Radzen markup for a component, with attributes filled
from caller-supplied options and validated against the component's parameters.
_Avoid_: Generate, template, render
