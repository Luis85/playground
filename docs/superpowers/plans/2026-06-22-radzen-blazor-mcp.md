# Radzen Blazor MCP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a local MCP server that gives a coding agent accurate Radzen Blazor component knowledge plus a markup-scaffolding tool.

**Architecture:** A .NET `extractor` reflects the `Radzen.Blazor` assembly and emits a committed `component-knowledge.json`. A TypeScript/Node MCP `server` loads that JSON at startup and exposes four stdio tools (`list_components`, `get_component`, `search_components`, `scaffold_component`). The JSON file is the contract between the two halves, so the server is built and tested first against a fixture.

**Tech Stack:** Node 20+, TypeScript, `@modelcontextprotocol/sdk`, `zod`, `tsx` + Node's built-in `node:test` runner; .NET 8 SDK for the extractor.

## Global Constraints

- Target the open-source `Radzen.Blazor` component library only (not Studio / legacy Angular).
- The running server has **no .NET dependency** and makes **no network calls** — it reads only the committed `component-knowledge.json`.
- Knowledge-base shape is fixed (see Task 2); every component record is `{ name, summary, parameters[], events[] }`.
- Ubiquitous language per `CONTEXT.md`; knowledge-source rationale per `docs/adr/0001-reflect-assembly-over-scraping.md`.
- TDD throughout: failing test first, minimal code, commit per task.
- All server source under `server/`, all extractor source under `extractor/`.

---

### Task 1: Server project scaffolding

**Files:**
- Create: `server/package.json`
- Create: `server/tsconfig.json`
- Create: `server/test/smoke.test.ts`
- Create: `server/.gitignore`

**Interfaces:**
- Consumes: nothing.
- Produces: an `npm test` command (runs `tsx --test test/**/*.test.ts`) and a TypeScript build setup later tasks rely on.

- [ ] **Step 1: Create `server/package.json`**

```json
{
  "name": "radzen-blazor-mcp",
  "version": "0.1.0",
  "type": "module",
  "bin": { "radzen-blazor-mcp": "dist/server.js" },
  "scripts": {
    "test": "tsx --test test/**/*.test.ts",
    "build": "tsc",
    "start": "tsx src/server.ts"
  },
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.0.0",
    "zod": "^3.23.0"
  },
  "devDependencies": {
    "tsx": "^4.19.0",
    "typescript": "^5.5.0",
    "@types/node": "^20.14.0"
  }
}
```

- [ ] **Step 2: Create `server/tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "outDir": "dist",
    "rootDir": "src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "declaration": false
  },
  "include": ["src"]
}
```

- [ ] **Step 3: Create `server/.gitignore`**

```
node_modules/
dist/
```

- [ ] **Step 4: Write the smoke test `server/test/smoke.test.ts`**

```ts
import { test } from "node:test";
import assert from "node:assert/strict";

test("test runner works", () => {
  assert.equal(1 + 1, 2);
});
```

- [ ] **Step 5: Install and run the smoke test**

Run: `cd server && npm install && npm test`
Expected: passes — "test runner works" (1 passing). If `npm install` cannot reach the registry, stop and report; the rest of the plan needs the deps.

- [ ] **Step 6: Commit**

```bash
git add server/package.json server/tsconfig.json server/.gitignore server/test/smoke.test.ts server/package-lock.json
git commit -m "chore(server): scaffold MCP server project"
```

---

### Task 2: Knowledge-base types and loader

**Files:**
- Create: `server/src/types.ts`
- Create: `server/src/knowledge.ts`
- Create: `server/test/fixtures/knowledge.json`
- Create: `server/test/knowledge.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - Types `ParameterInfo`, `EventInfo`, `ComponentInfo`, `KnowledgeBase`.
  - `loadKnowledgeBase(path: string): KnowledgeBase` — reads + validates JSON, throws on missing/malformed.

- [ ] **Step 1: Create the fixture `server/test/fixtures/knowledge.json`**

```json
{
  "radzenVersion": "5.0.0-test",
  "components": [
    {
      "name": "RadzenButton",
      "summary": "A button component that raises a Click event.",
      "parameters": [
        { "name": "Text", "type": "string", "default": "\"\"", "description": "The button text." },
        { "name": "Disabled", "type": "bool", "default": "false", "description": "Whether the button is disabled." }
      ],
      "events": [
        { "name": "Click", "type": "EventCallback<MouseEventArgs>", "description": "Raised when clicked." }
      ]
    },
    {
      "name": "RadzenLabel",
      "summary": "A label that displays text for an input.",
      "parameters": [
        { "name": "Text", "type": "string", "default": "\"\"", "description": "The label text." }
      ],
      "events": []
    }
  ]
}
```

- [ ] **Step 2: Write failing tests `server/test/knowledge.test.ts`**

```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { loadKnowledgeBase } from "../src/knowledge.ts";

const fixture = fileURLToPath(new URL("./fixtures/knowledge.json", import.meta.url));

test("loads and validates a well-formed knowledge base", () => {
  const kb = loadKnowledgeBase(fixture);
  assert.equal(kb.components.length, 2);
  assert.equal(kb.components[0].name, "RadzenButton");
  assert.equal(kb.components[0].parameters[1].name, "Disabled");
});

test("throws on a missing file", () => {
  assert.throws(() => loadKnowledgeBase("/no/such/file.json"), /knowledge base/i);
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `cd server && npm test`
Expected: FAIL — cannot find `../src/knowledge.ts`.

- [ ] **Step 4: Create `server/src/types.ts`**

```ts
export interface ParameterInfo {
  name: string;
  type: string;
  default: string | null;
  description: string;
}

export interface EventInfo {
  name: string;
  type: string;
  description: string;
}

export interface ComponentInfo {
  name: string;
  summary: string;
  parameters: ParameterInfo[];
  events: EventInfo[];
}

export interface KnowledgeBase {
  radzenVersion: string;
  components: ComponentInfo[];
}
```

- [ ] **Step 5: Create `server/src/knowledge.ts`**

```ts
import { readFileSync } from "node:fs";
import { z } from "zod";
import type { KnowledgeBase } from "./types.ts";

const parameterSchema = z.object({
  name: z.string(),
  type: z.string(),
  default: z.string().nullable(),
  description: z.string(),
});

const eventSchema = z.object({
  name: z.string(),
  type: z.string(),
  description: z.string(),
});

const componentSchema = z.object({
  name: z.string(),
  summary: z.string(),
  parameters: z.array(parameterSchema),
  events: z.array(eventSchema),
});

const knowledgeBaseSchema = z.object({
  radzenVersion: z.string(),
  components: z.array(componentSchema),
});

export function loadKnowledgeBase(path: string): KnowledgeBase {
  let raw: string;
  try {
    raw = readFileSync(path, "utf8");
  } catch (err) {
    throw new Error(`Could not read knowledge base at ${path}: ${(err as Error).message}`);
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    throw new Error(`Knowledge base at ${path} is not valid JSON: ${(err as Error).message}`);
  }
  const result = knowledgeBaseSchema.safeParse(parsed);
  if (!result.success) {
    throw new Error(`Knowledge base at ${path} has an invalid shape: ${result.error.message}`);
  }
  return result.data;
}
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `cd server && npm test`
Expected: PASS — both knowledge.test.ts cases pass.

- [ ] **Step 7: Commit**

```bash
git add server/src/types.ts server/src/knowledge.ts server/test/fixtures/knowledge.json server/test/knowledge.test.ts
git commit -m "feat(server): knowledge-base types and validating loader"
```

---

### Task 3: `list_components` logic

**Files:**
- Create: `server/src/tools/listComponents.ts`
- Create: `server/test/listComponents.test.ts`

**Interfaces:**
- Consumes: `KnowledgeBase` from `../src/types.ts`.
- Produces: `listComponents(kb: KnowledgeBase, filter?: string): { name: string; summary: string }[]` — all components when no filter; case-insensitive substring match over `name` + `summary` when filtered.

- [ ] **Step 1: Write failing tests `server/test/listComponents.test.ts`**

```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { listComponents } from "../src/tools/listComponents.ts";
import type { KnowledgeBase } from "../src/types.ts";

const kb: KnowledgeBase = {
  radzenVersion: "t",
  components: [
    { name: "RadzenButton", summary: "A button.", parameters: [], events: [] },
    { name: "RadzenLabel", summary: "A label.", parameters: [], events: [] },
  ],
};

test("lists all components with no filter", () => {
  const result = listComponents(kb);
  assert.deepEqual(result, [
    { name: "RadzenButton", summary: "A button." },
    { name: "RadzenLabel", summary: "A label." },
  ]);
});

test("filters case-insensitively over name and summary", () => {
  assert.deepEqual(listComponents(kb, "button"), [{ name: "RadzenButton", summary: "A button." }]);
  assert.deepEqual(listComponents(kb, "LABEL"), [{ name: "RadzenLabel", summary: "A label." }]);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd server && npm test`
Expected: FAIL — cannot find `../src/tools/listComponents.ts`.

- [ ] **Step 3: Create `server/src/tools/listComponents.ts`**

```ts
import type { KnowledgeBase } from "../types.ts";

export function listComponents(
  kb: KnowledgeBase,
  filter?: string,
): { name: string; summary: string }[] {
  const needle = filter?.toLowerCase().trim();
  return kb.components
    .filter((c) =>
      !needle ||
      c.name.toLowerCase().includes(needle) ||
      c.summary.toLowerCase().includes(needle),
    )
    .map((c) => ({ name: c.name, summary: c.summary }));
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd server && npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add server/src/tools/listComponents.ts server/test/listComponents.test.ts
git commit -m "feat(server): list_components logic"
```

---

### Task 4: `get_component` logic

**Files:**
- Create: `server/src/tools/getComponent.ts`
- Create: `server/test/getComponent.test.ts`

**Interfaces:**
- Consumes: `KnowledgeBase`, `ComponentInfo`.
- Produces: `getComponent(kb: KnowledgeBase, name: string): ComponentInfo` — exact case-insensitive name match; throws `Error` naming the component when not found.

- [ ] **Step 1: Write failing tests `server/test/getComponent.test.ts`**

```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { getComponent } from "../src/tools/getComponent.ts";
import type { KnowledgeBase } from "../src/types.ts";

const kb: KnowledgeBase = {
  radzenVersion: "t",
  components: [
    { name: "RadzenButton", summary: "A button.", parameters: [{ name: "Text", type: "string", default: "\"\"", description: "Text." }], events: [] },
  ],
};

test("returns the full component record by name (case-insensitive)", () => {
  const c = getComponent(kb, "radzenbutton");
  assert.equal(c.name, "RadzenButton");
  assert.equal(c.parameters[0].name, "Text");
});

test("throws naming the unknown component", () => {
  assert.throws(() => getComponent(kb, "RadzenNope"), /RadzenNope/);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd server && npm test`
Expected: FAIL — cannot find `../src/tools/getComponent.ts`.

- [ ] **Step 3: Create `server/src/tools/getComponent.ts`**

```ts
import type { ComponentInfo, KnowledgeBase } from "../types.ts";

export function getComponent(kb: KnowledgeBase, name: string): ComponentInfo {
  const needle = name.toLowerCase().trim();
  const found = kb.components.find((c) => c.name.toLowerCase() === needle);
  if (!found) {
    throw new Error(`Unknown component "${name}". Call list_components to see available components.`);
  }
  return found;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd server && npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add server/src/tools/getComponent.ts server/test/getComponent.test.ts
git commit -m "feat(server): get_component logic"
```

---

### Task 5: `search_components` logic

**Files:**
- Create: `server/src/tools/searchComponents.ts`
- Create: `server/test/searchComponents.test.ts`

**Interfaces:**
- Consumes: `KnowledgeBase`, `ComponentInfo`.
- Produces: `searchComponents(kb: KnowledgeBase, query: string): ComponentInfo[]` — case-insensitive substring match over component name, each parameter name, and each parameter description. Empty query returns `[]`.

- [ ] **Step 1: Write failing tests `server/test/searchComponents.test.ts`**

```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { searchComponents } from "../src/tools/searchComponents.ts";
import type { KnowledgeBase } from "../src/types.ts";

const kb: KnowledgeBase = {
  radzenVersion: "t",
  components: [
    { name: "RadzenButton", summary: "", parameters: [{ name: "Disabled", type: "bool", default: "false", description: "Whether disabled." }], events: [] },
    { name: "RadzenDataGrid", summary: "", parameters: [{ name: "Data", type: "IEnumerable", default: null, description: "The data source." }], events: [] },
  ],
};

test("matches on component name", () => {
  const r = searchComponents(kb, "grid");
  assert.deepEqual(r.map((c) => c.name), ["RadzenDataGrid"]);
});

test("matches on parameter name or description", () => {
  assert.deepEqual(searchComponents(kb, "disabled").map((c) => c.name), ["RadzenButton"]);
  assert.deepEqual(searchComponents(kb, "data source").map((c) => c.name), ["RadzenDataGrid"]);
});

test("empty query returns nothing", () => {
  assert.deepEqual(searchComponents(kb, "   "), []);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd server && npm test`
Expected: FAIL — cannot find `../src/tools/searchComponents.ts`.

- [ ] **Step 3: Create `server/src/tools/searchComponents.ts`**

```ts
import type { ComponentInfo, KnowledgeBase } from "../types.ts";

export function searchComponents(kb: KnowledgeBase, query: string): ComponentInfo[] {
  const needle = query.toLowerCase().trim();
  if (!needle) return [];
  return kb.components.filter((c) => {
    if (c.name.toLowerCase().includes(needle)) return true;
    return c.parameters.some(
      (p) =>
        p.name.toLowerCase().includes(needle) ||
        p.description.toLowerCase().includes(needle),
    );
  });
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd server && npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add server/src/tools/searchComponents.ts server/test/searchComponents.test.ts
git commit -m "feat(server): search_components logic"
```

---

### Task 6: `scaffold_component` logic

**Files:**
- Create: `server/src/tools/scaffoldComponent.ts`
- Create: `server/test/scaffoldComponent.test.ts`

**Interfaces:**
- Consumes: `KnowledgeBase`, and `getComponent` from `./getComponent.ts`.
- Produces: `scaffoldComponent(kb: KnowledgeBase, name: string, options?: Record<string, string>): string` — returns self-closing markup `<Name Attr="value" ... />`; attributes ordered as given; throws if the component is unknown (via `getComponent`) or any option key is not one of the component's parameter names (error lists the invalid keys).

- [ ] **Step 1: Write failing tests `server/test/scaffoldComponent.test.ts`**

```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { scaffoldComponent } from "../src/tools/scaffoldComponent.ts";
import type { KnowledgeBase } from "../src/types.ts";

const kb: KnowledgeBase = {
  radzenVersion: "t",
  components: [
    { name: "RadzenButton", summary: "", parameters: [
      { name: "Text", type: "string", default: "\"\"", description: "" },
      { name: "Disabled", type: "bool", default: "false", description: "" },
    ], events: [] },
  ],
};

test("scaffolds a self-closing tag with given attributes", () => {
  assert.equal(
    scaffoldComponent(kb, "RadzenButton", { Text: "Save", Disabled: "false" }),
    `<RadzenButton Text="Save" Disabled="false" />`,
  );
});

test("scaffolds a bare tag with no options", () => {
  assert.equal(scaffoldComponent(kb, "RadzenButton"), `<RadzenButton />`);
});

test("rejects unknown options listing the invalid keys", () => {
  assert.throws(
    () => scaffoldComponent(kb, "RadzenButton", { Nope: "x" }),
    /Nope/,
  );
});

test("rejects unknown component", () => {
  assert.throws(() => scaffoldComponent(kb, "RadzenNope"), /RadzenNope/);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd server && npm test`
Expected: FAIL — cannot find `../src/tools/scaffoldComponent.ts`.

- [ ] **Step 3: Create `server/src/tools/scaffoldComponent.ts`**

```ts
import type { KnowledgeBase } from "../types.ts";
import { getComponent } from "./getComponent.ts";

export function scaffoldComponent(
  kb: KnowledgeBase,
  name: string,
  options: Record<string, string> = {},
): string {
  const component = getComponent(kb, name); // throws on unknown component
  const valid = new Set(component.parameters.map((p) => p.name));
  const invalid = Object.keys(options).filter((k) => !valid.has(k));
  if (invalid.length > 0) {
    throw new Error(
      `Invalid option(s) for ${component.name}: ${invalid.join(", ")}. ` +
        `Valid parameters: ${[...valid].join(", ")}.`,
    );
  }
  const attrs = Object.entries(options)
    .map(([k, v]) => `${k}="${v}"`)
    .join(" ");
  return attrs ? `<${component.name} ${attrs} />` : `<${component.name} />`;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd server && npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add server/src/tools/scaffoldComponent.ts server/test/scaffoldComponent.test.ts
git commit -m "feat(server): scaffold_component logic"
```

---

### Task 7: MCP server entrypoint (stdio wiring)

**Files:**
- Create: `server/src/server.ts`
- Create: `server/test/server.test.ts`

**Interfaces:**
- Consumes: `loadKnowledgeBase`, and the four tool functions.
- Produces: `createServer(kb: KnowledgeBase): McpServer` with the four registered tools; plus a `main()` that loads the knowledge base (path from `RADZEN_KB_PATH` env or `../component-knowledge.json` relative to the server file) and connects a `StdioServerTransport`. The test exercises `createServer` registration, not the transport.

- [ ] **Step 1: Write failing test `server/test/server.test.ts`**

```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "../src/server.ts";
import type { KnowledgeBase } from "../src/types.ts";

const kb: KnowledgeBase = {
  radzenVersion: "t",
  components: [{ name: "RadzenButton", summary: "A button.", parameters: [], events: [] }],
};

test("createServer registers the four tools", async () => {
  const server = createServer(kb);
  // McpServer exposes a private tool registry; assert via listTools through the underlying server.
  const tools = (server as unknown as { _registeredTools: Record<string, unknown> })._registeredTools;
  assert.deepEqual(
    Object.keys(tools).sort(),
    ["get_component", "list_components", "scaffold_component", "search_components"],
  );
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd server && npm test`
Expected: FAIL — cannot find `../src/server.ts`.

- [ ] **Step 3: Create `server/src/server.ts`**

```ts
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import type { KnowledgeBase } from "./types.ts";
import { loadKnowledgeBase } from "./knowledge.ts";
import { listComponents } from "./tools/listComponents.ts";
import { getComponent } from "./tools/getComponent.ts";
import { searchComponents } from "./tools/searchComponents.ts";
import { scaffoldComponent } from "./tools/scaffoldComponent.ts";

function textResult(value: unknown) {
  return { content: [{ type: "text" as const, text: JSON.stringify(value, null, 2) }] };
}

function errorResult(err: unknown) {
  return { isError: true, content: [{ type: "text" as const, text: (err as Error).message }] };
}

export function createServer(kb: KnowledgeBase): McpServer {
  const server = new McpServer({ name: "radzen-blazor-mcp", version: "0.1.0" });

  server.registerTool(
    "list_components",
    {
      description: "List Radzen Blazor components, optionally filtered by a substring of the name or summary.",
      inputSchema: { filter: z.string().optional() },
    },
    async ({ filter }) => textResult(listComponents(kb, filter)),
  );

  server.registerTool(
    "get_component",
    {
      description: "Get the full API (parameters, events, summary) of a Radzen Blazor component by name.",
      inputSchema: { name: z.string() },
    },
    async ({ name }) => {
      try {
        return textResult(getComponent(kb, name));
      } catch (err) {
        return errorResult(err);
      }
    },
  );

  server.registerTool(
    "search_components",
    {
      description: "Search Radzen Blazor components by a query matched against component names, parameter names, and descriptions.",
      inputSchema: { query: z.string() },
    },
    async ({ query }) => textResult(searchComponents(kb, query)),
  );

  server.registerTool(
    "scaffold_component",
    {
      description: "Produce ready-to-paste Radzen Blazor markup for a component, with attributes filled from options (validated against the component's parameters).",
      inputSchema: { name: z.string(), options: z.record(z.string()).optional() },
    },
    async ({ name, options }) => {
      try {
        return textResult(scaffoldComponent(kb, name, options));
      } catch (err) {
        return errorResult(err);
      }
    },
  );

  return server;
}

async function main(): Promise<void> {
  const here = dirname(fileURLToPath(import.meta.url));
  const kbPath = process.env.RADZEN_KB_PATH ?? resolve(here, "..", "component-knowledge.json");
  const kb = loadKnowledgeBase(kbPath);
  const server = createServer(kb);
  await server.connect(new StdioServerTransport());
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd server && npm test`
Expected: PASS. If the `@modelcontextprotocol/sdk` private field name differs (`_registeredTools`), adjust the test to assert via the SDK's public `server.server.listTools()` request instead — keep the four expected names.

- [ ] **Step 5: Manual smoke check (optional)**

Run: `cd server && RADZEN_KB_PATH=test/fixtures/knowledge.json npm start`
Expected: process starts and waits on stdio (no crash). Ctrl-C to exit.

- [ ] **Step 6: Commit**

```bash
git add server/src/server.ts server/test/server.test.ts
git commit -m "feat(server): MCP stdio server wiring four tools"
```

---

### Task 8: Extractor project scaffolding (.NET)

**Files:**
- Create: `extractor/Extractor.csproj`
- Create: `extractor/Program.cs`
- Create: `extractor/.gitignore`

**Interfaces:**
- Consumes: nothing.
- Produces: a runnable .NET console app that references the `Radzen.Blazor` NuGet package and prints its resolved version. Real reflection logic lands in Task 9.

- [ ] **Step 1: Create `extractor/Extractor.csproj`**

```xml
<Project Sdk="Microsoft.NET.Sdk">
  <PropertyGroup>
    <OutputType>Exe</OutputType>
    <TargetFramework>net8.0</TargetFramework>
    <Nullable>enable</Nullable>
    <ImplicitUsings>enable</ImplicitUsings>
  </PropertyGroup>
  <ItemGroup>
    <PackageReference Include="Radzen.Blazor" Version="5.*" />
  </ItemGroup>
</Project>
```

- [ ] **Step 2: Create `extractor/.gitignore`**

```
bin/
obj/
```

- [ ] **Step 3: Create a placeholder `extractor/Program.cs`**

```csharp
using System.Reflection;

var asm = typeof(Radzen.Blazor.RadzenButton).Assembly;
Console.WriteLine($"Loaded {asm.GetName().Name} {asm.GetName().Version}");
```

- [ ] **Step 4: Build and run**

Run: `cd extractor && dotnet run`
Expected: prints `Loaded Radzen.Blazor 5.x.x.x`. If the .NET SDK is unavailable in this environment, stop and report — Tasks 8–10 require it; Tasks 1–7 (the server) do not.

- [ ] **Step 5: Commit**

```bash
git add extractor/Extractor.csproj extractor/Program.cs extractor/.gitignore
git commit -m "chore(extractor): scaffold .NET reflection tool"
```

---

### Task 9: Extractor reflection → knowledge JSON

**Files:**
- Modify: `extractor/Program.cs`

**Interfaces:**
- Consumes: the `Radzen.Blazor` assembly.
- Produces: writes `component-knowledge.json` (path = first CLI arg, default `../component-knowledge.json`) with the exact shape the server validates in Task 2: `{ radzenVersion, components: [{ name, summary, parameters[], events[] }] }`. `summary`/`description` are best-effort from the XML doc file if present, else empty string. `default` is the property's value on a default instance, stringified, or `null` if it can't be read.

- [ ] **Step 1: Replace `extractor/Program.cs`**

```csharp
using System.Reflection;
using System.Text.Json;
using System.Xml.Linq;
using Microsoft.AspNetCore.Components;
using Radzen;

var outputPath = args.Length > 0 ? args[0] : Path.Combine("..", "component-knowledge.json");

var assembly = typeof(Radzen.Blazor.RadzenButton).Assembly;
var version = assembly.GetName().Version?.ToString() ?? "unknown";

// Load XML doc summaries if the file sits next to the assembly.
var xmlPath = Path.ChangeExtension(assembly.Location, ".xml");
var summaries = new Dictionary<string, string>();
if (File.Exists(xmlPath))
{
    foreach (var member in XDocument.Load(xmlPath).Descendants("member"))
    {
        var name = member.Attribute("name")?.Value;
        var summary = member.Element("summary")?.Value.Trim().Replace('\n', ' ');
        if (name is not null && summary is not null)
            summaries[name] = System.Text.RegularExpressions.Regex.Replace(summary, "\\s+", " ");
    }
}

string TypeName(Type t)
{
    if (!t.IsGenericType) return t.Name;
    var args = string.Join(", ", t.GetGenericArguments().Select(TypeName));
    return $"{t.Name[..t.Name.IndexOf('`')]}<{args}>";
}

bool IsComponent(Type t) =>
    t.IsClass && !t.IsAbstract && t.IsPublic &&
    typeof(ComponentBase).IsAssignableFrom(t) &&
    t.Name.StartsWith("Radzen", StringComparison.Ordinal);

var components = new List<object>();
foreach (var type in assembly.GetExportedTypes().Where(IsComponent).OrderBy(t => t.Name))
{
    object? instance = null;
    try { instance = Activator.CreateInstance(type); } catch { /* leave defaults null */ }

    var parameters = new List<object>();
    var events = new List<object>();

    foreach (var prop in type.GetProperties(BindingFlags.Public | BindingFlags.Instance)
                             .Where(p => p.GetCustomAttribute<ParameterAttribute>() is not null)
                             .OrderBy(p => p.Name))
    {
        var memberKey = $"P:{prop.DeclaringType!.FullName}.{prop.Name}";
        var description = summaries.TryGetValue(memberKey, out var s) ? s : "";

        if (typeof(MulticastDelegate).IsAssignableFrom(prop.PropertyType) ||
            (prop.PropertyType.IsGenericType &&
             prop.PropertyType.GetGenericTypeDefinition() == typeof(EventCallback<>)) ||
            prop.PropertyType == typeof(EventCallback))
        {
            events.Add(new { name = prop.Name, type = TypeName(prop.PropertyType), description });
        }
        else
        {
            string? def = null;
            if (instance is not null)
            {
                try { def = JsonSerializer.Serialize(prop.GetValue(instance)); }
                catch { def = null; }
            }
            parameters.Add(new { name = prop.Name, type = TypeName(prop.PropertyType), @default = def, description });
        }
    }

    var typeKey = $"T:{type.FullName}";
    components.Add(new
    {
        name = type.Name,
        summary = summaries.TryGetValue(typeKey, out var ts) ? ts : "",
        parameters,
        events,
    });
}

var doc = new { radzenVersion = version, components };
var json = JsonSerializer.Serialize(doc, new JsonSerializerOptions { WriteIndented = true });
File.WriteAllText(outputPath, json);
Console.WriteLine($"Wrote {components.Count} components to {outputPath}");
```

- [ ] **Step 2: Run the extractor against a temp path and inspect**

Run: `cd extractor && dotnet run -- /tmp/kb.json`
Expected: prints `Wrote <N> components to /tmp/kb.json` with N in the dozens; `/tmp/kb.json` contains a `RadzenButton` entry with a `Click` event and a `Text` parameter.

- [ ] **Step 3: Validate the output against the server schema**

Run: `cd server && RADZEN_KB_PATH=/tmp/kb.json node --import tsx -e "import('./src/knowledge.ts').then(m => { m.loadKnowledgeBase(process.env.RADZEN_KB_PATH); console.log('valid'); })"`
Expected: prints `valid` (the loader's zod schema accepts the extractor output). If it throws, fix the extractor field shape to match Task 2 — the schema is the contract.

- [ ] **Step 4: Commit**

```bash
git add extractor/Program.cs
git commit -m "feat(extractor): reflect Radzen.Blazor into component-knowledge.json"
```

---

### Task 10: Generate the committed knowledge base + docs

**Files:**
- Create: `component-knowledge.json` (generated, committed)
- Create: `README.md`

**Interfaces:**
- Consumes: the extractor (Task 9) and server (Task 7).
- Produces: the real committed knowledge base at the repo root and a README documenting build/regenerate/run.

- [ ] **Step 1: Generate the real knowledge base at the repo root**

Run: `cd extractor && dotnet run -- ../component-knowledge.json`
Expected: `Wrote <N> components to ../component-knowledge.json`.

- [ ] **Step 2: Run the full server test suite against the committed file**

Run: `cd server && RADZEN_KB_PATH=../component-knowledge.json npm test`
Expected: all tests PASS (they use fixtures, but this confirms the committed file also loads via a quick start). Then: `cd server && RADZEN_KB_PATH=../component-knowledge.json npm start` starts without error (Ctrl-C to stop).

- [ ] **Step 3: Create `README.md`**

```markdown
# Radzen Blazor MCP

A local MCP server that gives a coding agent accurate Radzen Blazor component
knowledge plus a markup-scaffolding tool. See `docs/superpowers/specs/` for the
design and `docs/adr/` for key decisions.

## Layout

- `extractor/` — .NET tool that reflects `Radzen.Blazor` into `component-knowledge.json` (needs the .NET 8 SDK).
- `component-knowledge.json` — committed knowledge base; the contract between extractor and server.
- `server/` — TypeScript/Node MCP server (stdio); needs only Node 20+.

## Run the server

\`\`\`sh
cd server && npm install && npm start
\`\`\`

## Tools

- `list_components(filter?)`, `get_component(name)`, `search_components(query)`, `scaffold_component(name, options)`.

## Regenerate the knowledge base (on a Radzen version bump)

\`\`\`sh
cd extractor && dotnet run -- ../component-knowledge.json
\`\`\`

## Register with an MCP client (example)

\`\`\`json
{ "mcpServers": { "radzen-blazor": { "command": "node", "args": ["server/dist/server.js"] } } }
\`\`\`
```

- [ ] **Step 4: Commit**

```bash
git add component-knowledge.json README.md
git commit -m "feat: generate committed knowledge base and add README"
```

---

## Self-Review

**Spec coverage:**
- Target = Radzen.Blazor only → Global Constraints + Task 8 package ref. ✓
- Retrieval (list/get/search) → Tasks 3–5. ✓
- Scaffolding → Task 6. ✓
- Reflect assembly → JSON (ADR-0001) → Tasks 8–9. ✓
- Committed JSON, no .NET/network at runtime → Task 10 + server loads JSON only. ✓
- stdio transport → Task 7. ✓
- Error handling (unknown component/option, malformed JSON) → Tasks 2, 4, 6. ✓
- Testing (extractor mapping, server tools, contract) → per-task tests + Task 9 Step 3 contract check. ✓
- All ~90 components, generic scaffold → Task 9 enumerates all; Task 6 is parameter-driven. ✓

**Placeholder scan:** No TBD/TODO; every code step contains real code. ✓

**Type consistency:** `KnowledgeBase`/`ComponentInfo`/`ParameterInfo`/`EventInfo` defined in Task 2 and used unchanged in Tasks 3–7. Extractor JSON fields (`name`, `type`, `default`, `description`, `summary`, `parameters`, `events`, `radzenVersion`) match the zod schema in Task 2, with a runtime contract check in Task 9 Step 3. ✓

**Risk note:** Tasks 8–10 require the .NET 8 SDK and network access to restore the `Radzen.Blazor` package. If unavailable, Tasks 1–7 still deliver a working, fully-tested server runnable against `server/test/fixtures/knowledge.json` via `RADZEN_KB_PATH`.
```
