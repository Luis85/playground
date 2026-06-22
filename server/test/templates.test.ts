import { test } from "node:test";
import assert from "node:assert/strict";
import { listTemplates, scaffoldTemplate } from "../src/tools/templates.ts";
import { templates } from "../src/templates/templates.ts";

test("list_templates returns the catalog with option metadata", () => {
  const list = listTemplates();
  assert.equal(list.length, templates.length);
  const form = list.find((t) => t.id === "form");
  assert.ok(form && form.options.some((o) => o.name === "item_type"));
});

test("form template uses defaults and includes validation", () => {
  const markup = scaffoldTemplate("form");
  assert.match(markup, /<RadzenTemplateForm TItem="Model" Data="@model" Submit="@OnSubmit">/);
  assert.match(markup, /RadzenRequiredValidator Component="Name"/);
});

test("template options override defaults", () => {
  const markup = scaffoldTemplate("datagrid", { item_type: "Employee", data: "employees" });
  assert.match(markup, /Data="@employees" TItem="Employee"/);
});

test("dashboard renders the requested number of cards with computed width", () => {
  const markup = scaffoldTemplate("dashboard", { cards: "2" });
  assert.equal((markup.match(/<RadzenCard>/g) ?? []).length, 2);
  assert.match(markup, /SizeMD="6"/);
});

test("escapes option values to prevent markup injection", () => {
  const markup = scaffoldTemplate("layout", { app: 'Bob "Admin"' });
  assert.match(markup, /Text="Bob &quot;Admin&quot;"/);
  assert.doesNotMatch(markup, /Text="Bob "Admin""/);
});

test("unknown template suggests nearest", () => {
  assert.throws(() => scaffoldTemplate("frm"), /Did you mean.*form/s);
});
