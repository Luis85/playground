import { test } from "node:test";
import assert from "node:assert/strict";
import { renderComponentNote, renderIndexNote, relatedComponents, buildVault } from "../src/obsidian.ts";
import type { KnowledgeBase } from "../src/types.ts";

const kb: KnowledgeBase = {
  radzenVersion: "5.9.9.0",
  components: [
    { name: "RadzenDataGrid", summary: "A data grid.", parameters: [{ name: "Data", type: "IEnumerable", default: null, description: "The data source." }], events: [{ name: "RowSelect", type: "EventCallback<T>", description: "Row selected." }] },
    { name: "RadzenDataGridColumn", summary: "A grid column.", parameters: [], events: [] },
    { name: "RadzenButton", summary: "A button.", parameters: [], events: [] },
  ],
};

test("component note has frontmatter and tables", () => {
  const note = renderComponentNote(kb, kb.components[0]);
  assert.match(note, /^---\n/);
  assert.match(note, /title: RadzenDataGrid/);
  assert.match(note, /radzenVersion: 5\.9\.9\.0/);
  assert.match(note, /\| Data \| IEnumerable \|/);
  assert.match(note, /\| RowSelect \|/);
  assert.match(note, /\[\[RadzenDataGridColumn\]\]/);
  assert.match(note, /\[\[Radzen Components\]\]/);
});

test("relatedComponents links prefix families both ways", () => {
  assert.deepEqual(relatedComponents(kb, kb.components[0]), ["RadzenDataGridColumn"]);
  assert.deepEqual(relatedComponents(kb, kb.components[1]), ["RadzenDataGrid"]);
  assert.deepEqual(relatedComponents(kb, kb.components[2]), []);
});

test("index note links every component", () => {
  const idx = renderIndexNote(kb);
  assert.match(idx, /\[\[RadzenDataGrid\]\]/);
  assert.match(idx, /\[\[RadzenButton\]\]/);
});

test("buildVault returns index + one note per component", () => {
  const files = buildVault(kb);
  assert.ok(files.some((f) => f.path === "Radzen Components.md"));
  assert.ok(files.some((f) => f.path === "components/RadzenButton.md"));
  assert.equal(files.length, kb.components.length + 1);
});
