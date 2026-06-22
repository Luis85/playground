#!/usr/bin/env node
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { realpathSync, existsSync } from "node:fs";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import type { KnowledgeBase } from "./types.ts";
import { loadKnowledgeBase } from "./knowledge.ts";
import { listComponents } from "./tools/listComponents.ts";
import { getComponent } from "./tools/getComponent.ts";
import { searchComponents } from "./tools/searchComponents.ts";
import { scaffoldComponent } from "./tools/scaffoldComponent.ts";
import { formatComponent } from "./format.ts";
import { writeVault } from "./exportObsidian.ts";
import { listUsageTopics, getUsage, usageTopicsForComponent } from "./tools/usage.ts";
import { listTemplates, scaffoldTemplate } from "./tools/templates.ts";

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
        "List Radzen Blazor component names with one-line summaries. Use to discover what components exist before drilling into one. Summaries come from Radzen's published docs and may be empty in the current build.",
      inputSchema: {
        filter: z
          .string()
          .optional()
          .describe("Optional case-insensitive substring to filter by component name or summary."),
      },
    },
    async ({ filter }) => textResult(listComponents(kb, filter)),
  );

  server.registerTool(
    "get_component",
    {
      description:
        "Get a Radzen Blazor component's full API. Use before writing markup for a component to get exact parameter and event names instead of guessing. Returns parameters (name/type/default/description), events, and ids of related usage guides (see get_usage).",
      inputSchema: {
        name: z.string().describe("Exact component class name, e.g. 'RadzenDataGrid'."),
        response_format: z
          .enum(["concise", "detailed"])
          .optional()
          .describe(
            "'concise' returns names only (token-cheap); 'detailed' (default) returns full metadata.",
          ),
      },
    },
    async ({ name, response_format }) => {
      try {
        const component = getComponent(kb, name);
        const formatted = formatComponent(component, response_format ?? "detailed") as object;
        // Point the agent at curated usage guides relevant to this component.
        const usageTopics = usageTopicsForComponent(component.name);
        return textResult({ ...formatted, usageTopics });
      } catch (err) {
        return errorResult(err);
      }
    },
  );

  server.registerTool(
    "search_components",
    {
      description:
        "Fuzzy-search Radzen Blazor components by a query matched (typo-tolerant) against component names, parameter names, and descriptions. Use when you don't know the exact component name. Descriptions may be empty in the current build, but name/parameter matching still works.",
      inputSchema: {
        query: z.string().describe("Free-text query, e.g. 'grid', 'date picker', 'disabled'."),
      },
    },
    async ({ query }) => textResult(searchComponents(kb, query)),
  );

  server.registerTool(
    "scaffold_component",
    {
      description:
        "Produce ready-to-paste Radzen Blazor markup for a component, with attributes filled from options (validated against the component's parameters and events).",
      inputSchema: {
        name: z.string().describe("Exact component class name, e.g. 'RadzenButton'."),
        options: z
          .record(z.string())
          .optional()
          .describe(
            "Attribute name → value map. Keys must be valid parameters or events of the component, e.g. { \"Text\": \"Save\", \"Click\": \"@OnClick\" }.",
          ),
      },
    },
    async ({ name, options }) => {
      try {
        // Return the markup as raw text (not JSON-encoded) so it is paste-ready.
        return { content: [{ type: "text" as const, text: scaffoldComponent(kb, name, options) }] };
      } catch (err) {
        return errorResult(err);
      }
    },
  );

  server.registerTool(
    "list_usage_topics",
    {
      description:
        "List curated Radzen Blazor usage topics (setup, data-binding, validation, datagrid, events, layout, theming, dialogs-notifications, icons). Use to find the right how-to before writing a feature; then call get_usage.",
      inputSchema: {},
    },
    async () => textResult(listUsageTopics()),
  );

  server.registerTool(
    "get_usage",
    {
      description:
        "Get a curated Radzen Blazor usage guide (markdown with working code) for a topic id. Covers the structural patterns reflection can't show: setup, @bind-Value, validation linkage, DataGrid LoadData, theming, layout, services, events, icons.",
      inputSchema: {
        topic_id: z.string().describe("Topic id from list_usage_topics, e.g. 'datagrid' or 'validation'."),
      },
    },
    async ({ topic_id }) => {
      try {
        return textResult(getUsage(topic_id));
      } catch (err) {
        return errorResult(err);
      }
    },
  );

  server.registerTool(
    "list_templates",
    {
      description:
        "List ready-made Radzen Blazor markup templates (form, datagrid, layout, dashboard) with their options. Use to scaffold a whole pattern, not just one component; then call scaffold_template.",
      inputSchema: {},
    },
    async () => textResult(listTemplates()),
  );

  server.registerTool(
    "scaffold_template",
    {
      description:
        "Generate ready-to-paste Radzen Blazor markup for a common pattern (validated form, data grid, app layout shell, dashboard card grid). Options fill in type/handler/field names; omitted options use sensible defaults.",
      inputSchema: {
        template_id: z.string().describe("Template id from list_templates, e.g. 'form' or 'datagrid'."),
        options: z
          .record(z.string())
          .optional()
          .describe("Template option values, e.g. { \"item_type\": \"Employee\", \"data\": \"employees\" }."),
      },
    },
    async ({ template_id, options }) => {
      try {
        return { content: [{ type: "text" as const, text: scaffoldTemplate(template_id, options) }] };
      } catch (err) {
        return errorResult(err);
      }
    },
  );

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

  return server;
}

async function main(): Promise<void> {
  const here = dirname(fileURLToPath(import.meta.url));
  // Prefer a knowledge base bundled next to the entrypoint (published npm
  // package / built dist); fall back to the repo root during development.
  const candidates = [
    resolve(here, "component-knowledge.json"),
    resolve(here, "..", "..", "component-knowledge.json"),
  ];
  const kbPath =
    process.env.RADZEN_KB_PATH ?? candidates.find(existsSync) ?? candidates[candidates.length - 1];
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
