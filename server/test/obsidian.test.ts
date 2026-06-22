import { test } from "node:test";
import assert from "node:assert/strict";
import {
  renderComponentNote,
  renderIndexNote,
  renderUsageNote,
  relatedComponents,
  buildVault,
} from "../src/obsidian.ts";
import type { KnowledgeBase } from "../src/types.ts";
import type { UsageTopic } from "../src/usage/topics.ts";

const kb: KnowledgeBase = {
  radzenVersion: "5.9.9.0",
  components: [
    { name: "RadzenDataGrid", summary: "A data grid.", typeParameters: ["TItem"], parameters: [{ name: "Data", type: "IEnumerable", default: null, description: "The data source." }], events: [{ name: "RowSelect", type: "EventCallback<T>", description: "Row selected." }] },
    { name: "RadzenDataGridColumn", summary: "A grid column.", typeParameters: [], parameters: [], events: [] },
    { name: "RadzenButton", summary: "A button.", typeParameters: [], parameters: [], events: [] },
  ],
};

const topics: UsageTopic[] = [
  { id: "datagrid", title: "DataGrid binding", summary: "Grid patterns.", components: ["RadzenDataGrid"], markdown: "## DataGrid\n\nUse LoadData." },
];

test("component note has frontmatter, tables, and usage links", () => {
  const note = renderComponentNote(kb, kb.components[0], topics);
  assert.match(note, /^---\n/);
  assert.match(note, /title: RadzenDataGrid/);
  assert.match(note, /radzenVersion: 5\.9\.9\.0/);
  assert.match(note, /\| Data \| IEnumerable \|/);
  assert.match(note, /\| RowSelect \|/);
  assert.match(note, /\[\[RadzenDataGridColumn\]\]/);
  assert.match(note, /\[\[DataGrid binding\]\]/); // related usage guide
  assert.match(note, /\[\[Radzen Components\]\]/);
});

test("relatedComponents links prefix families both ways", () => {
  assert.deepEqual(relatedComponents(kb, kb.components[0]), ["RadzenDataGridColumn"]);
  assert.deepEqual(relatedComponents(kb, kb.components[1]), ["RadzenDataGrid"]);
  assert.deepEqual(relatedComponents(kb, kb.components[2]), []);
});

test("usage note links related components and the index", () => {
  const note = renderUsageNote(topics[0]);
  assert.match(note, /title: DataGrid binding/);
  assert.match(note, /Use LoadData\./);
  assert.match(note, /\[\[RadzenDataGrid\]\]/);
  assert.match(note, /\[\[Radzen Components\]\]/);
});

test("index note links components and usage guides", () => {
  const idx = renderIndexNote(kb, topics);
  assert.match(idx, /\[\[RadzenDataGrid\]\]/);
  assert.match(idx, /\[\[RadzenButton\]\]/);
  assert.match(idx, /\[\[DataGrid binding\]\]/);
});

test("buildVault returns index + component notes + usage notes", () => {
  const files = buildVault(kb, topics);
  assert.ok(files.some((f) => f.path === "Radzen Components.md"));
  assert.ok(files.some((f) => f.path === "components/RadzenButton.md"));
  assert.ok(files.some((f) => f.path === "usage/DataGrid binding.md"));
  assert.equal(files.length, kb.components.length + topics.length + 1);
});
