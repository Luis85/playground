import { test } from "node:test";
import assert from "node:assert/strict";
import { listUsageTopics, getUsage, usageTopicsForComponent } from "../src/tools/usage.ts";
import { usageTopics } from "../src/usage/topics.ts";

test("list_usage_topics returns the catalog without markdown bodies", () => {
  const list = listUsageTopics();
  assert.equal(list.length, usageTopics.length);
  assert.ok(list.every((t) => t.id && t.title && !("markdown" in t)));
  assert.ok(list.some((t) => t.id === "datagrid"));
});

test("get_usage returns the full topic by id", () => {
  const t = getUsage("datagrid");
  assert.equal(t.id, "datagrid");
  assert.match(t.markdown, /LoadData/);
});

test("get_usage suggests nearest topic on a miss", () => {
  assert.throws(() => getUsage("datagrd"), /Did you mean.*datagrid/s);
});

test("usageTopicsForComponent finds topics referencing a component", () => {
  assert.ok(usageTopicsForComponent("RadzenDataGrid").includes("datagrid"));
  assert.deepEqual(usageTopicsForComponent("RadzenNotAComponent"), []);
});

test("corpus integrity: unique non-empty ids and well-formed topics", () => {
  const ids = usageTopics.map((t) => t.id);
  assert.equal(new Set(ids).size, ids.length, "ids must be unique");
  for (const t of usageTopics) {
    assert.ok(t.id && t.title && t.summary && t.markdown, `topic ${t.id} fully populated`);
    assert.ok(Array.isArray(t.components), `topic ${t.id} has components array`);
  }
});
