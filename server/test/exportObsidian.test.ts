import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve, sep } from "node:path";
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
  assert.match(note, /title: "RadzenButton"/);
  const idx = readFileSync(join(dir, "Radzen Components.md"), "utf8");
  assert.match(idx, /\[\[RadzenButton\]\]/);
  const usage = readFileSync(join(dir, "usage", "Events.md"), "utf8");
  assert.match(usage, /title: "Events"/);
});

test("a component named Radzen/Bad:Name writes a safe filename under outDir", () => {
  const dir = mkdtempSync(join(tmpdir(), "vault-"));
  const badKb: KnowledgeBase = {
    radzenVersion: "5.9.9.0",
    components: [{ name: "Radzen/Bad:Name", summary: "Bad.", typeParameters: [], parameters: [], events: [] }],
  };
  const written = writeVault(badKb, dir, []);
  const componentFile = written.find((p) => p.includes("components"));
  assert.ok(componentFile);
  // The written path stays inside the output dir and contains no traversal chars.
  assert.ok(resolve(componentFile!).startsWith(resolve(dir) + sep));
  assert.match(componentFile!, /components.Radzen-Bad-Name\.md$/);
  // And it is actually readable (proves it was written somewhere valid).
  assert.match(readFileSync(componentFile!, "utf8"), /title: "Radzen\/Bad:Name"/);
});

test("components sanitizing to the same basename get de-duped filenames", () => {
  const dir = mkdtempSync(join(tmpdir(), "vault-"));
  const dupKb: KnowledgeBase = {
    radzenVersion: "5.9.9.0",
    components: [
      { name: "Radzen:Foo", summary: "A.", typeParameters: [], parameters: [], events: [] },
      { name: "Radzen/Foo", summary: "B.", typeParameters: [], parameters: [], events: [] },
    ],
  };
  const written = writeVault(dupKb, dir, []);
  const names = written
    .filter((p) => p.includes("components"))
    .map((p) => p.split(sep).pop());
  assert.equal(names.length, 2);
  // Both collapse to "Radzen-Foo"; the second gets a "-2" suffix, no overwrite.
  assert.ok(names.includes("Radzen-Foo.md"));
  assert.ok(names.includes("Radzen-Foo-2.md"));
});
