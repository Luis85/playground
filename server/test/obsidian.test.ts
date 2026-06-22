import { test } from "node:test";
import assert from "node:assert/strict";
import {
  renderComponentNote,
  renderIndexNote,
  renderUsageNote,
  relatedComponents,
  buildVault,
  noteName,
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
  assert.match(note, /title: "RadzenDataGrid"/);
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
  assert.match(note, /title: "DataGrid binding"/);
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

test("noteName strips path-unsafe chars and matches link/file", () => {
  assert.equal(noteName("Radzen/Bad:Name"), "Radzen-Bad-Name");
  assert.equal(noteName(".."), "-");
  assert.equal(noteName("  spaced   out  "), "spaced out");
});

test("component named Radzen/Bad:Name yields a safe filename and matching link", () => {
  const badKb: KnowledgeBase = {
    radzenVersion: "5.9.9.0",
    components: [
      { name: "RadzenDataGrid", summary: "Grid.", typeParameters: [], parameters: [], events: [] },
      { name: "RadzenDataGridBad:Name", summary: "Bad.", typeParameters: [], parameters: [], events: [] },
    ],
  };
  const files = buildVault(badKb, []);
  const safe = files.find((f) => f.path.includes("Bad"));
  assert.ok(safe && /^components\/RadzenDataGridBad-Name\.md$/.test(safe.path));
  // The related-components wikilink in RadzenDataGrid's note uses the same sanitized name.
  const note = renderComponentNote(badKb, badKb.components[0], []);
  assert.match(note, /\[\[RadzenDataGridBad-Name\]\]/);
});

test("YAML frontmatter quotes values containing a colon", () => {
  const colonKb: KnowledgeBase = {
    radzenVersion: "5.9.9.0",
    components: [{ name: "RadzenButton", summary: "A: button", typeParameters: [], parameters: [], events: [] }],
  };
  const idx = renderIndexNote(colonKb, []);
  assert.match(idx, /^title: "Radzen Components"$/m);
  const usageNote = renderUsageNote({
    id: "x:y",
    title: "Topic: With Colon",
    summary: "s",
    components: [],
    markdown: "## m",
  });
  assert.match(usageNote, /^title: "Topic: With Colon"$/m);
  assert.match(usageNote, /^topicId: "x:y"$/m);
});

test("escapeCell escapes backslash and pipe and flattens newlines", () => {
  const cellKb: KnowledgeBase = {
    radzenVersion: "5.9.9.0",
    components: [
      {
        name: "RadzenButton",
        summary: "",
        typeParameters: [],
        parameters: [{ name: "P", type: "a|b", default: "x\\y", description: "line1\nline2" }],
        events: [],
      },
    ],
  };
  const note = renderComponentNote(cellKb, cellKb.components[0], []);
  assert.match(note, /a\\\|b/); // pipe escaped
  assert.match(note, /x\\\\y/); // backslash escaped first
  assert.doesNotMatch(note, /line1\nline2/); // newline flattened
});
