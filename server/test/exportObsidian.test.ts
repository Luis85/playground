import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { writeVault } from "../src/exportObsidian.ts";
import type { KnowledgeBase } from "../src/types.ts";

const kb: KnowledgeBase = {
  radzenVersion: "5.9.9.0",
  components: [{ name: "RadzenButton", summary: "A button.", typeParameters: [], parameters: [], events: [] }],
};

const topics = [
  { id: "events", title: "Events", summary: "Handlers.", components: ["RadzenButton"], markdown: "## Events" },
];

test("writeVault writes index, component, and usage notes to disk", () => {
  const dir = mkdtempSync(join(tmpdir(), "vault-"));
  const written = writeVault(kb, dir, topics);
  assert.equal(written.length, 3); // index + 1 component + 1 usage note
  const note = readFileSync(join(dir, "components", "RadzenButton.md"), "utf8");
  assert.match(note, /title: RadzenButton/);
  const idx = readFileSync(join(dir, "Radzen Components.md"), "utf8");
  assert.match(idx, /\[\[RadzenButton\]\]/);
  const usage = readFileSync(join(dir, "usage", "Events.md"), "utf8");
  assert.match(usage, /title: Events/);
});
