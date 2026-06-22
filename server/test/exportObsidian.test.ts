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
