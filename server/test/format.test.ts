import { test } from "node:test";
import assert from "node:assert/strict";
import { formatComponent } from "../src/format.ts";
import type { ComponentInfo } from "../src/types.ts";

const c: ComponentInfo = {
  name: "RadzenDropDown",
  summary: "A drop down.",
  typeParameters: ["TValue"],
  parameters: [{ name: "Value", type: "object", default: null, description: "The value." }],
  events: [{ name: "Change", type: "EventCallback<object>", description: "Changed." }],
};

test("concise returns names only, including type parameters", () => {
  assert.deepEqual(formatComponent(c, "concise"), {
    name: "RadzenDropDown",
    summary: "A drop down.",
    typeParameters: ["TValue"],
    parameters: ["Value"],
    events: ["Change"],
  });
});

test("detailed returns the full record", () => {
  assert.deepEqual(formatComponent(c, "detailed"), c);
});
