import { test } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "../src/server.ts";
import type { KnowledgeBase } from "../src/types.ts";

const kb: KnowledgeBase = {
  radzenVersion: "t",
  components: [{ name: "RadzenButton", summary: "A button.", parameters: [], events: [] }],
};

test("createServer registers the nine tools", () => {
  const server = createServer(kb);
  const tools = (server as unknown as { _registeredTools: Record<string, unknown> })._registeredTools;
  assert.deepEqual(
    Object.keys(tools).sort(),
    [
      "export_obsidian_library",
      "get_component",
      "get_usage",
      "list_components",
      "list_templates",
      "list_usage_topics",
      "scaffold_component",
      "scaffold_template",
      "search_components",
    ],
  );
});
