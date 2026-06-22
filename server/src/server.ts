#!/usr/bin/env node
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { realpathSync } from "node:fs";
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
      description:
        "List Radzen Blazor components, optionally filtered by a substring of the name or summary.",
      inputSchema: { filter: z.string().optional() },
    },
    async ({ filter }) => textResult(listComponents(kb, filter)),
  );

  server.registerTool(
    "get_component",
    {
      description:
        "Get the full API (parameters, events, summary) of a Radzen Blazor component by name.",
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
      description:
        "Search Radzen Blazor components by a query matched against component names, parameter names, and descriptions.",
      inputSchema: { query: z.string() },
    },
    async ({ query }) => textResult(searchComponents(kb, query)),
  );

  server.registerTool(
    "scaffold_component",
    {
      description:
        "Produce ready-to-paste Radzen Blazor markup for a component, with attributes filled from options (validated against the component's parameters).",
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
  // `here` is server/src (tsx) or server/dist (built); the committed knowledge
  // base lives at the repo root, two levels up.
  const kbPath = process.env.RADZEN_KB_PATH ?? resolve(here, "..", "..", "component-knowledge.json");
  const kb = loadKnowledgeBase(kbPath);
  const server = createServer(kb);
  await server.connect(new StdioServerTransport());
}

// True when this file is the process entrypoint. Compares decoded, realpath-
// resolved filesystem paths so it works with spaces/escapes in the path and
// when invoked through a bin symlink.
function isMainModule(): boolean {
  if (!process.argv[1]) return false;
  try {
    return realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url));
  } catch {
    return false;
  }
}

if (isMainModule()) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
