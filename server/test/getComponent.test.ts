import { test } from "node:test";
import assert from "node:assert/strict";
import { getComponent } from "../src/tools/getComponent.ts";
import type { KnowledgeBase } from "../src/types.ts";

const kb: KnowledgeBase = {
  radzenVersion: "t",
  components: [
    {
      name: "RadzenButton",
      summary: "A button.",
      parameters: [{ name: "Text", type: "string", default: '""', description: "Text." }],
      events: [],
    },
  ],
};

test("returns the full component record by name (case-insensitive)", () => {
  const c = getComponent(kb, "radzenbutton");
  assert.equal(c.name, "RadzenButton");
  assert.equal(c.parameters[0].name, "Text");
});

test("throws naming the unknown component", () => {
  assert.throws(() => getComponent(kb, "RadzenNope"), /RadzenNope/);
});
