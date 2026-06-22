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
