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
