import { test } from "node:test";
import assert from "node:assert/strict";
import { scaffoldComponent } from "../src/tools/scaffoldComponent.ts";
import type { KnowledgeBase } from "../src/types.ts";

const kb: KnowledgeBase = {
  radzenVersion: "t",
  components: [
    {
      name: "RadzenButton",
      summary: "",
      typeParameters: [],
      parameters: [
        { name: "Text", type: "string", default: '""', description: "" },
        { name: "Disabled", type: "bool", default: "false", description: "" },
      ],
      events: [{ name: "Click", type: "EventCallback<MouseEventArgs>", description: "" }],
    },
    {
      name: "RadzenDropDown",
      summary: "",
      typeParameters: ["TValue"],
      parameters: [{ name: "Data", type: "IEnumerable", default: null, description: "" }],
      events: [],
    },
  ],
};

test("accepts Razor generic type parameters", () => {
  assert.equal(
    scaffoldComponent(kb, "RadzenDropDown", { TValue: "int", Data: "@items" }),
    `<RadzenDropDown TValue="int" Data="@items" />`,
  );
});

test("accepts event callbacks as attributes", () => {
  assert.equal(
    scaffoldComponent(kb, "RadzenButton", { Text: "Save", Click: "@OnClick" }),
    `<RadzenButton Text="Save" Click="@OnClick" />`,
  );
});

test("escapes attribute values", () => {
  assert.equal(
    scaffoldComponent(kb, "RadzenButton", { Text: 'Save "draft"' }),
    `<RadzenButton Text="Save &quot;draft&quot;" />`,
  );
});

test("scaffolds a self-closing tag with given attributes", () => {
  assert.equal(
    scaffoldComponent(kb, "RadzenButton", { Text: "Save", Disabled: "false" }),
    `<RadzenButton Text="Save" Disabled="false" />`,
  );
});

test("scaffolds a bare tag with no options", () => {
  assert.equal(scaffoldComponent(kb, "RadzenButton"), `<RadzenButton />`);
});

test("rejects unknown options listing the invalid keys", () => {
  assert.throws(() => scaffoldComponent(kb, "RadzenButton", { Nope: "x" }), /Nope/);
});

test("rejects unknown component", () => {
  assert.throws(() => scaffoldComponent(kb, "RadzenNope"), /RadzenNope/);
});
