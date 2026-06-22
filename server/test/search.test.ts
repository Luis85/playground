import { test } from "node:test";
import assert from "node:assert/strict";
import { fuzzySearch, suggestNames } from "../src/search.ts";
import type { KnowledgeBase } from "../src/types.ts";

const kb: KnowledgeBase = {
  radzenVersion: "t",
  components: [
    { name: "RadzenDataGrid", summary: "A data grid.", parameters: [{ name: "Data", type: "IEnumerable", default: null, description: "The data source." }], events: [] },
    { name: "RadzenButton", summary: "A button.", parameters: [{ name: "Text", type: "string", default: '""', description: "The text." }], events: [] },
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
