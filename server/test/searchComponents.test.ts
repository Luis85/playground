import { test } from "node:test";
import assert from "node:assert/strict";
import { searchComponents } from "../src/tools/searchComponents.ts";
import type { KnowledgeBase } from "../src/types.ts";

const kb: KnowledgeBase = {
  radzenVersion: "t",
  components: [
    {
      name: "RadzenButton",
      summary: "",
      parameters: [{ name: "Disabled", type: "bool", default: "false", description: "Whether disabled." }],
      events: [],
    },
    {
      name: "RadzenDataGrid",
      summary: "",
      parameters: [{ name: "Data", type: "IEnumerable", default: null, description: "The data source." }],
      events: [],
    },
  ],
};

test("matches on component name (typo tolerant)", () => {
  assert.deepEqual(searchComponents(kb, "datagrd").map((c) => c.name), ["RadzenDataGrid"]);
});

test("matches on parameter description", () => {
  assert.deepEqual(searchComponents(kb, "data source").map((c) => c.name), ["RadzenDataGrid"]);
});

test("empty query returns nothing", () => {
  assert.deepEqual(searchComponents(kb, "   "), []);
});
