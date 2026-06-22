import { test } from "node:test";
import assert from "node:assert/strict";
import { formatComponent } from "../src/format.ts";
import type { ComponentInfo } from "../src/types.ts";

const c: ComponentInfo = {
  name: "RadzenButton",
  summary: "A button.",
  parameters: [{ name: "Text", type: "string", default: '""', description: "The text." }],
  events: [{ name: "Click", type: "EventCallback<MouseEventArgs>", description: "Clicked." }],
};

test("concise returns names only", () => {
  assert.deepEqual(formatComponent(c, "concise"), {
    name: "RadzenButton",
    summary: "A button.",
    parameters: ["Text"],
    events: ["Click"],
  });
});

test("detailed returns the full record", () => {
  assert.deepEqual(formatComponent(c, "detailed"), c);
});
