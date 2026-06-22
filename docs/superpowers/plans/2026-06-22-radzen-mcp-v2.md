# Radzen Blazor MCP v2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the Radzen Blazor MCP broad, polished, and user-friendly — fuzzy search, helpful errors, token-controlled output, frictionless install — and add an Obsidian-compatible markdown component library generator.

**Architecture:** Unchanged core (committed `component-knowledge.json` → TS/Node stdio MCP server). v2 adds a shared search module (Fuse.js), output formatting, a new `export_obsidian_library` tool + CLI that renders one frontmatter+markdown note per component with wikilinks, plus DX (npx packaging, `.mcp.json`, install badges) and automated KB-freshness (Renovate).

**Tech Stack:** Node 20+, TypeScript 5.7+, `@modelcontextprotocol/sdk`, `zod`, `fuse.js`, `node:test` + `tsx`.

## Global Constraints

- Server stays offline: no network calls at runtime, reads only `component-knowledge.json`.
- Knowledge-base shape is fixed (`{ radzenVersion, components[] }`, each `{ name, summary, parameters[], events[] }`) — see v1 `server/src/types.ts`. Do not change it.
- All new server code under `server/src/`; tests under `server/test/`. TDD: failing test first, minimal code, commit per task.
- Tool names are `snake_case`; every tool input field has a description.
- Obsidian notes use `[[Wikilinks]]` (basename-resolved) and YAML frontmatter delimited by `---`.
- Keep tools few and high-leverage; do not duplicate behavior across tools.

---

### Task 1: Fuzzy search + suggestion module

**Files:**
- Modify: `server/package.json` (add `fuse.js`)
- Create: `server/src/search.ts`
- Create: `server/test/search.test.ts`

**Interfaces:**
- Consumes: `KnowledgeBase`, `ComponentInfo`.
- Produces:
  - `createSearchIndex(kb): Fuse<ComponentInfo>`
  - `fuzzySearch(kb, query, limit?): ComponentInfo[]` — relevance-ranked; empty query → `[]`.
  - `suggestNames(kb, name, n?): string[]` — nearest component names for "did you mean".

- [ ] **Step 1: Add the dependency**

Run: `cd server && npm install fuse.js@^7.0.0`
Expected: `fuse.js` added to `dependencies`; `npm test` still green.

- [ ] **Step 2: Write failing tests `server/test/search.test.ts`**

```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { fuzzySearch, suggestNames } from "../src/search.ts";
import type { KnowledgeBase } from "../src/types.ts";

const kb: KnowledgeBase = {
  radzenVersion: "t",
  components: [
    { name: "RadzenDataGrid", summary: "A data grid.", parameters: [{ name: "Data", type: "IEnumerable", default: null, description: "The data source." }], events: [] },
    { name: "RadzenButton", summary: "A button.", parameters: [{ name: "Text", type: "string", default: "\"\"", description: "The text." }], events: [] },
    { name: "RadzenDropDown", summary: "A drop down.", parameters: [], events: [] },
  ],
};

test("fuzzy search tolerates typos and ranks by relevance", () => {
  const names = fuzzySearch(kb, "datagrd").map((c) => c.name);
  assert.equal(names[0], "RadzenDataGrid");
});

test("fuzzy search matches parameter text", () => {
  assert.deepEqual(fuzzySearch(kb, "data source").map((c) => c.name), ["RadzenDataGrid"]);
});

test("empty query returns nothing", () => {
  assert.deepEqual(fuzzySearch(kb, "   "), []);
});

test("suggestNames returns nearest names for a near-miss", () => {
  const s = suggestNames(kb, "RadzenButtonn", 3);
  assert.ok(s.includes("RadzenButton"));
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `cd server && npm test`
Expected: FAIL — cannot find `../src/search.ts`.

- [ ] **Step 4: Create `server/src/search.ts`**

```ts
import Fuse from "fuse.js";
import type { ComponentInfo, KnowledgeBase } from "./types.ts";

export function createSearchIndex(kb: KnowledgeBase): Fuse<ComponentInfo> {
  return new Fuse(kb.components, {
    includeScore: true,
    threshold: 0.4,
    ignoreLocation: true,
    keys: [
      { name: "name", weight: 0.6 },
      { name: "parameters.name", weight: 0.2 },
      { name: "summary", weight: 0.1 },
      { name: "parameters.description", weight: 0.1 },
    ],
  });
}

export function fuzzySearch(kb: KnowledgeBase, query: string, limit = 25): ComponentInfo[] {
  if (!query.trim()) return [];
  return createSearchIndex(kb)
    .search(query, { limit })
    .map((r) => r.item);
}

export function suggestNames(kb: KnowledgeBase, name: string, n = 3): string[] {
  const fuse = new Fuse(kb.components, {
    keys: ["name"],
    threshold: 0.5,
    ignoreLocation: true,
  });
  return fuse.search(name, { limit: n }).map((r) => r.item.name);
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd server && npm test`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add server/package.json server/package-lock.json server/src/search.ts server/test/search.test.ts
git commit -m "feat(server): fuzzy search + name suggestions (fuse.js)"
```

---

### Task 2: Route `search_components` through fuzzy search

**Files:**
- Modify: `server/src/tools/searchComponents.ts`
- Modify: `server/test/searchComponents.test.ts`

**Interfaces:**
- Consumes: `fuzzySearch` from `../search.ts`.
- Produces: `searchComponents(kb, query): ComponentInfo[]` — now typo-tolerant, relevance-ranked. Empty query → `[]` (unchanged contract).

- [ ] **Step 1: Update tests `server/test/searchComponents.test.ts`**

Replace the file body's logic-bearing tests with these (keep the existing `kb` fixture and imports):

```ts
test("matches on component name (typo tolerant)", () => {
  assert.deepEqual(searchComponents(kb, "datagrd").map((c) => c.name), ["RadzenDataGrid"]);
});

test("matches on parameter description", () => {
  assert.deepEqual(searchComponents(kb, "data source").map((c) => c.name), ["RadzenDataGrid"]);
});

test("empty query returns nothing", () => {
  assert.deepEqual(searchComponents(kb, "   "), []);
});
```

- [ ] **Step 2: Run tests to verify the typo case fails**

Run: `cd server && npm test`
Expected: FAIL on "datagrd" (substring impl can't match a typo).

- [ ] **Step 3: Replace `server/src/tools/searchComponents.ts`**

```ts
import type { ComponentInfo, KnowledgeBase } from "../types.ts";
import { fuzzySearch } from "../search.ts";

export function searchComponents(kb: KnowledgeBase, query: string): ComponentInfo[] {
  return fuzzySearch(kb, query);
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd server && npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add server/src/tools/searchComponents.ts server/test/searchComponents.test.ts
git commit -m "feat(server): make search_components typo-tolerant"
```

---

### Task 3: "Did you mean" suggestions on unknown component

**Files:**
- Modify: `server/src/tools/getComponent.ts`
- Modify: `server/test/getComponent.test.ts`

**Interfaces:**
- Consumes: `suggestNames` from `../search.ts`.
- Produces: `getComponent(kb, name)` unchanged on hit; on miss throws an `Error` that names the input AND lists up to 3 nearest component names.

- [ ] **Step 1: Add a failing test to `server/test/getComponent.test.ts`**

```ts
test("unknown component error suggests nearest names", () => {
  const kb2 = { radzenVersion: "t", components: [
    { name: "RadzenButton", summary: "", parameters: [], events: [] },
  ] };
  assert.throws(() => getComponent(kb2 as any, "RadzenButtonn"), /Did you mean.*RadzenButton/s);
});
```

- [ ] **Step 2: Run tests to verify it fails**

Run: `cd server && npm test`
Expected: FAIL — error has no "Did you mean".

- [ ] **Step 3: Update `server/src/tools/getComponent.ts`**

```ts
import type { ComponentInfo, KnowledgeBase } from "../types.ts";
import { suggestNames } from "../search.ts";

export function getComponent(kb: KnowledgeBase, name: string): ComponentInfo {
  const needle = name.toLowerCase().trim();
  const found = kb.components.find((c) => c.name.toLowerCase() === needle);
  if (!found) {
    const suggestions = suggestNames(kb, name, 3);
    const hint = suggestions.length
      ? ` Did you mean: ${suggestions.join(", ")}?`
      : " Call list_components to see available components.";
    throw new Error(`Unknown component "${name}".${hint}`);
  }
  return found;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd server && npm test`
Expected: PASS (existing `/RadzenNope/` test still matches; scaffold inherits suggestions via getComponent).

- [ ] **Step 5: Commit**

```bash
git add server/src/tools/getComponent.ts server/test/getComponent.test.ts
git commit -m "feat(server): 'did you mean' suggestions on unknown component"
```

---

### Task 4: `response_format` (concise | detailed) output shaping

**Files:**
- Create: `server/src/format.ts`
- Create: `server/test/format.test.ts`

**Interfaces:**
- Consumes: `ComponentInfo`.
- Produces: `formatComponent(component, format): unknown` where `format` is `"concise" | "detailed"`. `concise` → `{ name, summary, parameters: string[] (names), events: string[] (names) }`; `detailed` → the full `ComponentInfo`.

- [ ] **Step 1: Write failing tests `server/test/format.test.ts`**

```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { formatComponent } from "../src/format.ts";
import type { ComponentInfo } from "../src/types.ts";

const c: ComponentInfo = {
  name: "RadzenButton",
  summary: "A button.",
  parameters: [{ name: "Text", type: "string", default: "\"\"", description: "The text." }],
  events: [{ name: "Click", type: "EventCallback<MouseEventArgs>", description: "Clicked." }],
};

test("concise returns names only", () => {
  assert.deepEqual(formatComponent(c, "concise"), {
    name: "RadzenButton",
    summary: "A button.",
    parameters: ["Text"],
    events: ["Click"],
  });
});

test("detailed returns the full record", () => {
  assert.deepEqual(formatComponent(c, "detailed"), c);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd server && npm test`
Expected: FAIL — cannot find `../src/format.ts`.

- [ ] **Step 3: Create `server/src/format.ts`**

```ts
import type { ComponentInfo } from "./types.ts";

export type ResponseFormat = "concise" | "detailed";

export function formatComponent(component: ComponentInfo, format: ResponseFormat): unknown {
  if (format === "detailed") return component;
  return {
    name: component.name,
    summary: component.summary,
    parameters: component.parameters.map((p) => p.name),
    events: component.events.map((e) => e.name),
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd server && npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add server/src/format.ts server/test/format.test.ts
git commit -m "feat(server): concise/detailed component formatting"
```

---

### Task 5: Obsidian library renderer

**Files:**
- Create: `server/src/obsidian.ts`
- Create: `server/test/obsidian.test.ts`

**Interfaces:**
- Consumes: `ComponentInfo`, `KnowledgeBase`.
- Produces:
  - `renderComponentNote(kb, component): string` — YAML frontmatter + markdown body (summary, parameters table, events table, related `[[wikilinks]]`, backlink to index).
  - `renderIndexNote(kb): string` — MOC linking every component.
  - `relatedComponents(kb, component): string[]` — names in a prefix relationship with `component` (e.g. `RadzenDataGrid` ↔ `RadzenDataGridColumn`), excluding self.
  - `buildVault(kb): { path: string; content: string }[]` — index note at `Radzen Components.md` + one note per component at `components/<Name>.md`.

- [ ] **Step 1: Write failing tests `server/test/obsidian.test.ts`**

```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { renderComponentNote, renderIndexNote, relatedComponents, buildVault } from "../src/obsidian.ts";
import type { KnowledgeBase } from "../src/types.ts";

const kb: KnowledgeBase = {
  radzenVersion: "5.9.9.0",
  components: [
    { name: "RadzenDataGrid", summary: "A data grid.", parameters: [{ name: "Data", type: "IEnumerable", default: null, description: "The data source." }], events: [{ name: "RowSelect", type: "EventCallback<T>", description: "Row selected." }] },
    { name: "RadzenDataGridColumn", summary: "A grid column.", parameters: [], events: [] },
    { name: "RadzenButton", summary: "A button.", parameters: [], events: [] },
  ],
};

test("component note has frontmatter and tables", () => {
  const note = renderComponentNote(kb, kb.components[0]);
  assert.match(note, /^---\n/);
  assert.match(note, /title: RadzenDataGrid/);
  assert.match(note, /radzenVersion: 5\.9\.9\.0/);
  assert.match(note, /\| Data \| IEnumerable \|/);     // parameters table row
  assert.match(note, /\| RowSelect \|/);                // events table row
  assert.match(note, /\[\[RadzenDataGridColumn\]\]/);   // related wikilink
  assert.match(note, /\[\[Radzen Components\]\]/);      // backlink to index
});

test("relatedComponents links prefix families both ways", () => {
  assert.deepEqual(relatedComponents(kb, kb.components[0]), ["RadzenDataGridColumn"]);
  assert.deepEqual(relatedComponents(kb, kb.components[1]), ["RadzenDataGrid"]);
  assert.deepEqual(relatedComponents(kb, kb.components[2]), []);
});

test("index note links every component", () => {
  const idx = renderIndexNote(kb);
  assert.match(idx, /\[\[RadzenDataGrid\]\]/);
  assert.match(idx, /\[\[RadzenButton\]\]/);
});

test("buildVault returns index + one note per component", () => {
  const files = buildVault(kb);
  assert.ok(files.some((f) => f.path === "Radzen Components.md"));
  assert.ok(files.some((f) => f.path === "components/RadzenButton.md"));
  assert.equal(files.length, kb.components.length + 1);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd server && npm test`
Expected: FAIL — cannot find `../src/obsidian.ts`.

- [ ] **Step 3: Create `server/src/obsidian.ts`**

```ts
import type { ComponentInfo, KnowledgeBase } from "./types.ts";

const INDEX_TITLE = "Radzen Components";

export function relatedComponents(kb: KnowledgeBase, component: ComponentInfo): string[] {
  return kb.components
    .filter((c) => c.name !== component.name)
    .filter((c) => c.name.startsWith(component.name) || component.name.startsWith(c.name))
    .map((c) => c.name);
}

function escapeCell(text: string): string {
  return text.replace(/\|/g, "\\|").replace(/\n/g, " ");
}

function table(header: string[], rows: string[][]): string {
  if (rows.length === 0) return "_None._";
  const head = `| ${header.join(" | ")} |`;
  const sep = `| ${header.map(() => "---").join(" | ")} |`;
  const body = rows.map((r) => `| ${r.map(escapeCell).join(" | ")} |`).join("\n");
  return `${head}\n${sep}\n${body}`;
}

export function renderComponentNote(kb: KnowledgeBase, component: ComponentInfo): string {
  const alias = component.name.replace(/^Radzen/, "");
  const frontmatter = [
    "---",
    `title: ${component.name}`,
    `aliases: [${alias}]`,
    "type: radzen-component",
    `radzenVersion: ${kb.radzenVersion}`,
    `parameters: ${component.parameters.length}`,
    `events: ${component.events.length}`,
    "tags: [radzen, blazor, component]",
    "---",
  ].join("\n");

  const params = table(
    ["Name", "Type", "Default", "Description"],
    component.parameters.map((p) => [p.name, p.type, p.default ?? "—", p.description || "—"]),
  );
  const events = table(
    ["Name", "Type", "Description"],
    component.events.map((e) => [e.name, e.type, e.description || "—"]),
  );
  const related = relatedComponents(kb, component);
  const relatedBlock = related.length
    ? related.map((n) => `- [[${n}]]`).join("\n")
    : "_None._";

  return [
    frontmatter,
    `# ${component.name}`,
    component.summary || "_No summary available._",
    "## Parameters",
    params,
    "## Events",
    events,
    "## Related",
    relatedBlock,
    "---",
    `Back to [[${INDEX_TITLE}]]`,
    "",
  ].join("\n\n");
}

export function renderIndexNote(kb: KnowledgeBase): string {
  const frontmatter = [
    "---",
    `title: ${INDEX_TITLE}`,
    "type: radzen-index",
    `radzenVersion: ${kb.radzenVersion}`,
    `components: ${kb.components.length}`,
    "tags: [radzen, blazor, moc]",
    "---",
  ].join("\n");
  const list = [...kb.components]
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((c) => `- [[${c.name}]] — ${c.summary || ""}`.trimEnd())
    .join("\n");
  return [
    frontmatter,
    `# ${INDEX_TITLE}`,
    `Radzen Blazor component library (${kb.components.length} components, v${kb.radzenVersion}).`,
    list,
    "",
  ].join("\n\n");
}

export function buildVault(kb: KnowledgeBase): { path: string; content: string }[] {
  return [
    { path: `${INDEX_TITLE}.md`, content: renderIndexNote(kb) },
    ...kb.components.map((c) => ({
      path: `components/${c.name}.md`,
      content: renderComponentNote(kb, c),
    })),
  ];
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd server && npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add server/src/obsidian.ts server/test/obsidian.test.ts
git commit -m "feat(server): Obsidian vault renderer (frontmatter + wikilinks)"
```

---

### Task 6: Vault writer + CLI

**Files:**
- Create: `server/src/exportObsidian.ts`
- Create: `server/test/exportObsidian.test.ts`
- Modify: `server/package.json` (add `export:obsidian` script)

**Interfaces:**
- Consumes: `buildVault`, `loadKnowledgeBase`.
- Produces:
  - `writeVault(kb, outDir): string[]` — writes every vault file under `outDir` (creating `components/`), returns the list of absolute paths written.
  - A CLI `main()` reading `RADZEN_KB_PATH` (default repo-root KB) + first arg as `outDir` (default `./radzen-obsidian-vault`).

- [ ] **Step 1: Write failing test `server/test/exportObsidian.test.ts`**

```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { writeVault } from "../src/exportObsidian.ts";
import type { KnowledgeBase } from "../src/types.ts";

const kb: KnowledgeBase = {
  radzenVersion: "5.9.9.0",
  components: [{ name: "RadzenButton", summary: "A button.", parameters: [], events: [] }],
};

test("writeVault writes index + component notes to disk", () => {
  const dir = mkdtempSync(join(tmpdir(), "vault-"));
  const written = writeVault(kb, dir);
  assert.equal(written.length, 2);
  const note = readFileSync(join(dir, "components", "RadzenButton.md"), "utf8");
  assert.match(note, /title: RadzenButton/);
  const idx = readFileSync(join(dir, "Radzen Components.md"), "utf8");
  assert.match(idx, /\[\[RadzenButton\]\]/);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd server && npm test`
Expected: FAIL — cannot find `../src/exportObsidian.ts`.

- [ ] **Step 3: Create `server/src/exportObsidian.ts`**

```ts
import { fileURLToPath } from "node:url";
import { dirname, resolve, join } from "node:path";
import { mkdirSync, writeFileSync, realpathSync } from "node:fs";
import type { KnowledgeBase } from "./types.ts";
import { loadKnowledgeBase } from "./knowledge.ts";
import { buildVault } from "./obsidian.ts";

export function writeVault(kb: KnowledgeBase, outDir: string): string[] {
  const written: string[] = [];
  for (const file of buildVault(kb)) {
    const full = join(outDir, file.path);
    mkdirSync(dirname(full), { recursive: true });
    writeFileSync(full, file.content, "utf8");
    written.push(full);
  }
  return written;
}

function main(): void {
  const here = dirname(fileURLToPath(import.meta.url));
  const kbPath = process.env.RADZEN_KB_PATH ?? resolve(here, "..", "..", "component-knowledge.json");
  const outDir = resolve(process.argv[2] ?? "radzen-obsidian-vault");
  const kb = loadKnowledgeBase(kbPath);
  const written = writeVault(kb, outDir);
  console.log(`Wrote ${written.length} notes to ${outDir}`);
}

function isMainModule(): boolean {
  if (!process.argv[1]) return false;
  try {
    return realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url));
  } catch {
    return false;
  }
}

if (isMainModule()) main();
```

- [ ] **Step 4: Add the npm script to `server/package.json`**

Add to `scripts`: `"export:obsidian": "tsx src/exportObsidian.ts"`.

- [ ] **Step 5: Run tests + a real CLI smoke test**

Run: `cd server && npm test`
Expected: PASS.
Run: `cd server && RADZEN_KB_PATH=../component-knowledge.json npm run export:obsidian -- /tmp/radzen-vault && ls /tmp/radzen-vault/components | wc -l`
Expected: prints "Wrote 216 notes…" and the components dir holds 215 notes.

- [ ] **Step 6: Commit**

```bash
git add server/src/exportObsidian.ts server/test/exportObsidian.test.ts server/package.json
git commit -m "feat(server): write Obsidian vault to disk + export:obsidian CLI"
```

---

### Task 7: Wire new tools + polish descriptions/schemas

**Files:**
- Modify: `server/src/server.ts`
- Modify: `server/test/server.test.ts`

**Interfaces:**
- Consumes: `formatComponent`, `writeVault`, existing tool functions.
- Produces: `createServer(kb)` registering **5** tools — the four existing (now with refined descriptions, per-field input descriptions, and a `response_format` option on `get_component`) plus `export_obsidian_library`.

- [ ] **Step 1: Update `server/test/server.test.ts`**

```ts
assert.deepEqual(
  Object.keys(tools).sort(),
  ["export_obsidian_library", "get_component", "list_components", "scaffold_component", "search_components"],
);
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd server && npm test`
Expected: FAIL — only four tools registered.

- [ ] **Step 3: Update `server/src/server.ts`**

Add imports:

```ts
import { formatComponent } from "./format.ts";
import { writeVault } from "./exportObsidian.ts";
```

Change the `get_component` registration to accept a format:

```ts
server.registerTool(
  "get_component",
  {
    description:
      "Get a Radzen Blazor component's full API. Use before writing markup for a component to get exact parameter and event names. Returns parameters (name/type/default/description) and events.",
    inputSchema: {
      name: z.string().describe("Exact component class name, e.g. 'RadzenDataGrid'."),
      response_format: z
        .enum(["concise", "detailed"])
        .optional()
        .describe("'concise' returns names only (token-cheap); 'detailed' (default) returns full metadata."),
    },
  },
  async ({ name, response_format }) => {
    try {
      return textResult(formatComponent(getComponent(kb, name), response_format ?? "detailed"));
    } catch (err) {
      return errorResult(err);
    }
  },
);
```

Add the new tool (after `scaffold_component`):

```ts
server.registerTool(
  "export_obsidian_library",
  {
    description:
      "Generate an Obsidian-compatible markdown library of all Radzen components (one note per component with YAML frontmatter, parameter/event tables, and [[wikilinks]], plus an index note) into a directory.",
    inputSchema: {
      output_dir: z.string().describe("Absolute path to the directory to write the vault into."),
    },
  },
  async ({ output_dir }) => {
    try {
      const written = writeVault(kb, output_dir);
      return textResult({ notesWritten: written.length, outputDir: output_dir });
    } catch (err) {
      return errorResult(err);
    }
  },
);
```

Also refine the `list_components`, `search_components`, and `scaffold_component` descriptions to state *when* to use them and add `.describe()` to each input field (e.g. `filter`, `query`, `name`, `options`).

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd server && npm test`
Expected: PASS (5 tools registered).

- [ ] **Step 5: End-to-end smoke check**

Create `server/e2e.tmp.mjs` that connects a client, asserts 5 tools, calls `get_component` with `response_format: "concise"`, and calls `export_obsidian_library` with a temp dir; run it, then delete it.

Run: `cd server && RADZEN_KB_PATH=../component-knowledge.json node e2e.tmp.mjs`
Expected: 5 tools; concise payload has name + string arrays; export reports `notesWritten: 216`. Remove the temp file after.

- [ ] **Step 6: Commit**

```bash
git add server/src/server.ts server/test/server.test.ts
git commit -m "feat(server): register export_obsidian_library + response_format + richer tool descriptions"
```

---

### Task 8: DX — npx packaging, config, install badges, README

**Files:**
- Modify: `server/package.json` (`mcpName`, `files`, `engines`)
- Create: `.mcp.json` (repo-root, project-scoped server config)
- Modify: `README.md`

**Interfaces:**
- Consumes: built `dist/server.js` (bin from v1).
- Produces: a committable project-scoped `.mcp.json`, npx-ready package metadata, and README install/Obsidian docs.

- [ ] **Step 1: Add package metadata to `server/package.json`**

Add: `"mcpName": "io.github.luis85/radzen-blazor-mcp"`, `"engines": { "node": ">=20" }`, and `"files": ["dist", "README.md"]`.

- [ ] **Step 2: Create repo-root `.mcp.json`**

```json
{
  "mcpServers": {
    "radzen-blazor": {
      "command": "node",
      "args": ["server/dist/server.js"]
    }
  }
}
```

- [ ] **Step 3: Update `README.md`**

Add a "Quick start" section: `cd server && npm install && npm run build`, then either commit/use the project-scoped `.mcp.json` or `claude mcp add radzen-blazor -- node "$PWD/server/dist/server.js"`. Add an "Obsidian library" section documenting the `export_obsidian_library` tool and `npm run export:obsidian -- <dir>`, describing the frontmatter fields and wikilink structure. Add a tools table including `export_obsidian_library`.

- [ ] **Step 4: Verify the project-scoped config is valid JSON and points at a real path**

Run: `node -e "const c=require('./.mcp.json'); if(!c.mcpServers['radzen-blazor']) throw new Error('bad'); console.log('ok')"` (from repo root)
Expected: prints `ok`.

- [ ] **Step 5: Commit**

```bash
git add server/package.json .mcp.json README.md
git commit -m "docs(dx): project .mcp.json, npx metadata, README quick start + Obsidian docs"
```

---

### Task 9: Automated knowledge-base freshness (Renovate)

**Files:**
- Create: `.github/renovate.json`

**Interfaces:**
- Consumes: the `Radzen.Blazor` version pin in `extractor/Extractor.csproj`.
- Produces: a Renovate config that opens a PR when a new `Radzen.Blazor` is released; that PR edits `extractor/**`, which triggers the existing regeneration workflow to refresh `component-knowledge.json`.

- [ ] **Step 1: Create `.github/renovate.json`**

```json
{
  "$schema": "https://docs.renovatebot.com/renovate-schema.json",
  "extends": ["config:recommended"],
  "nuget": { "enabled": true },
  "packageRules": [
    {
      "matchManagers": ["nuget"],
      "matchPackageNames": ["Radzen.Blazor"],
      "commitMessageTopic": "Radzen.Blazor (regenerates the knowledge base)",
      "labels": ["radzen-update"]
    }
  ]
}
```

- [ ] **Step 2: Validate JSON**

Run: `node -e "require('./.github/renovate.json'); console.log('ok')"`
Expected: prints `ok`.

- [ ] **Step 3: Commit**

```bash
git add .github/renovate.json
git commit -m "ci: Renovate watches Radzen.Blazor to auto-refresh the knowledge base"
```

---

### Task 10: Honest documentation contract + best-effort summaries

**Context:** The committed knowledge base currently has **empty `summary`/`description` fields** for all components and parameters — the `Radzen.Blazor` NuGet package ships no XML documentation alongside the assembly, so reflection yields API shape only (as ADR-0001 anticipated). Until rich docs are sourced (see below), the tool must not over-promise, and search must stay useful without descriptions (it already matches names + parameter names).

**Files:**
- Modify: `extractor/Program.cs`
- Modify: `extractor/Extractor.csproj`
- Modify: `README.md`
- Modify: `docs/adr/0001-reflect-assembly-over-scraping.md`

**Interfaces:**
- Consumes: nothing new.
- Produces: an extractor that attempts to locate the package XML docs and reports how many summaries it populated; honest tool/README wording.

- [ ] **Step 1: Best-effort XML docs in the extractor**

In `extractor/Extractor.csproj`, add to the `Radzen.Blazor` `PackageReference`: `GeneratePathProperty="true"`, and add a property `<CopyDocumentationFilesFromPackages>true</CopyDocumentationFilesFromPackages>`. In `Program.cs`, after computing `xmlPath`, if it does not exist, also probe `AppContext.BaseDirectory` for `Radzen.Blazor.xml` before giving up.

- [ ] **Step 2: Report coverage**

In `Program.cs`, after building `components`, compute `populated = components.Count(c => !string.IsNullOrEmpty(((dynamic)c).summary))` is not possible with anonymous types — instead track a counter while building: increment when a non-empty summary is written. Print `Console.WriteLine($"Summaries populated: {summaryCount}/{components.Count}");`. Do **not** fail the build when zero (XML genuinely absent), but the line makes regressions visible in CI logs.

- [ ] **Step 3: Make the contract honest**

Update tool descriptions in `server/src/server.ts` (`list_components`, `get_component`, `search_components`) to state that summaries/descriptions are sourced from Radzen's published docs and **may be empty** in the current build, and that search also matches component and parameter names. Update `README.md` and the ADR-0001 "Consequences" to record the empty-docs state and that doc/example enrichment is the tracked next step.

- [ ] **Step 4: Verify**

Run: `cd server && npm test` → PASS. (Extractor changes can't be run here without .NET; the regeneration workflow exercises them and the new log line will show the summary count.)

- [ ] **Step 5: Commit**

```bash
git add extractor/Program.cs extractor/Extractor.csproj README.md docs/adr/0001-reflect-assembly-over-scraping.md server/src/server.ts
git commit -m "feat(extractor): best-effort doc summaries + honest empty-docs contract"
```

> **Flagship follow-up (separate spec, out of v2 scope):** populate real summaries and usage examples by sourcing `blazor.radzen.com` per-component docs (the research report's item #6) — a `@bind-Value`/`LoadData`/validation/theming usage corpus and an `examples` field on each component. This is a substantial, network-dependent feature deserving its own brainstorm → spec → plan.

---

## Self-Review

**Spec/roadmap coverage:**
- Quick win — fuzzy search → Tasks 1–2. ✓
- Quick win — "did you mean" → Task 3. ✓
- Quick win — response_format / token control → Tasks 4, 7. ✓
- Quick win — tool description/schema polish → Task 7. ✓
- Quick win — npx/.mcp.json/badges DX → Task 8. ✓
- Quick win — auto KB freshness → Task 9. ✓
- New feature — Obsidian frontmatter+markdown library → Tasks 5–7 (renderer, writer/CLI, MCP tool). ✓
- Polish — honest docs contract + best-effort summaries (empty-docs gap) → Task 10. ✓

**Placeholder scan:** All code steps contain real code; README step describes concrete sections to add. No TBD/TODO.

**Type consistency:** `KnowledgeBase`/`ComponentInfo` reused unchanged from v1. New functions referenced across tasks (`fuzzySearch`, `suggestNames`, `formatComponent`, `buildVault`, `writeVault`) are defined before use and called with matching signatures. Tool count rises from 4 → 5 (Task 7 updates the registration test accordingly).

**Scope:** One cohesive enhancement of the existing server, shippable incrementally (each task green + committed). Medium/large roadmap items (usage-knowledge enrichment, sqlite-vec semantic search, eval harness, template library) are intentionally out of scope for v2 and tracked in the research report.

**Risk note:** All v2 work is Node-only — no .NET needed. The Obsidian note counts (216 = 215 components + index) assume the committed KB; tests use small fixtures so they don't depend on it.
