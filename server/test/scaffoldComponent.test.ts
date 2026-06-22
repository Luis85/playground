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
        { name: "Attributes", type: "IReadOnlyDictionary<String, Object>", default: null, description: "" },
      ],
      events: [{ name: "Click", type: "EventCallback<MouseEventArgs>", description: "" }],
    },
    {
      name: "RadzenDropDown",
      summary: "",
      typeParameters: ["TValue"],
      parameters: [
        { name: "Value", type: "object", default: null, description: "" },
        { name: "Data", type: "IEnumerable", default: null, description: "" },
      ],
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

test("accepts @bind-<param> and Razor directives", () => {
  assert.equal(
    scaffoldComponent(kb, "RadzenDropDown", { "@bind-Value": "@selected" }),
    `<RadzenDropDown @bind-Value="@selected" />`,
  );
  assert.equal(
    scaffoldComponent(kb, "RadzenButton", { "@rendermode": "InteractiveServer" }),
    `<RadzenButton @rendermode="InteractiveServer" />`,
  );
});

test("rejects @bind- targeting a non-parameter", () => {
  assert.throws(() => scaffoldComponent(kb, "RadzenButton", { "@bind-Nope": "x" }), /Nope/);
});

test("allows HTML pass-through attributes on catch-all components", () => {
  assert.equal(
    scaffoldComponent(kb, "RadzenButton", { Text: "Save", class: "rz-m-2", "aria-label": "Save" }),
    `<RadzenButton Text="Save" class="rz-m-2" aria-label="Save" />`,
  );
});

test("still rejects misspelled PascalCase parameters on catch-all components", () => {
  assert.throws(() => scaffoldComponent(kb, "RadzenButton", { Tex: "Save" }), /Tex/);
});

test("rejects arbitrary attributes when there is no catch-all", () => {
  // RadzenDropDown fixture has no Attributes catch-all.
  assert.throws(() => scaffoldComponent(kb, "RadzenDropDown", { class: "x" }), /class/);
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
