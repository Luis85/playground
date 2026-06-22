import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { resolveKbPath } from "../src/server.ts";

test("RADZEN_KB_PATH overrides every candidate", () => {
  const here = mkdtempSync(join(tmpdir(), "kb-"));
  // Even with a bundled file present, the env override wins.
  writeFileSync(join(here, "component-knowledge.json"), "{}");
  const path = resolveKbPath(here, { RADZEN_KB_PATH: "/explicit/kb.json" } as NodeJS.ProcessEnv);
  assert.equal(path, "/explicit/kb.json");
});

test("prefers a KB bundled next to the entrypoint over the repo root", () => {
  // Build a layout where both candidates could exist; only the bundled one does.
  const root = mkdtempSync(join(tmpdir(), "kb-"));
  const here = join(root, "a", "b"); // resolve(here, "..","..") === root
  mkdirSync(here, { recursive: true });
  writeFileSync(join(here, "component-knowledge.json"), "{}");
  writeFileSync(join(root, "component-knowledge.json"), "{}");
  const path = resolveKbPath(here, {} as NodeJS.ProcessEnv);
  assert.equal(path, resolve(here, "component-knowledge.json"));
});

test("falls back to the repo-root candidate when nothing is bundled", () => {
  const root = mkdtempSync(join(tmpdir(), "kb-"));
  const here = join(root, "a", "b");
  mkdirSync(here, { recursive: true });
  // Neither candidate exists on disk; falls back to the last (repo-root) candidate.
  const path = resolveKbPath(here, {} as NodeJS.ProcessEnv);
  assert.equal(path, resolve(here, "..", "..", "component-knowledge.json"));
});
