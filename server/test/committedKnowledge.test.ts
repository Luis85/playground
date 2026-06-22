import { test } from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { loadKnowledgeBase } from "../src/knowledge.ts";

// The committed knowledge base lives at the repo root, two levels above this file
// (test/ -> server/ -> repo root).
const kbPath = fileURLToPath(new URL("../../component-knowledge.json", import.meta.url));

test("committed component-knowledge.json parses and is well-formed", () => {
  const kb = loadKnowledgeBase(kbPath);
  assert.ok(kb.components.length >= 200, `expected >= 200 components, got ${kb.components.length}`);
  assert.ok(kb.radzenVersion.startsWith("5."), `radzenVersion should start with 5., got ${kb.radzenVersion}`);

  const names = kb.components.map((c) => c.name);
  assert.equal(new Set(names).size, names.length, "component names must be unique");
  assert.ok(
    kb.components.every((c) => c.name.trim().length > 0),
    "no component may have an empty name",
  );
});
