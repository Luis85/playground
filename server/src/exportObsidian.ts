import { fileURLToPath } from "node:url";
import { dirname, resolve, join } from "node:path";
import { mkdirSync, writeFileSync, realpathSync } from "node:fs";
import type { KnowledgeBase } from "./types.ts";
import { loadKnowledgeBase } from "./knowledge.ts";
import { buildVault } from "./obsidian.ts";
import { usageTopics, type UsageTopic } from "./usage/topics.ts";

export function writeVault(kb: KnowledgeBase, outDir: string, topics: UsageTopic[] = usageTopics): string[] {
  const written: string[] = [];
  for (const file of buildVault(kb, topics)) {
    const full = join(outDir, file.path);
    mkdirSync(dirname(full), { recursive: true });
    writeFileSync(full, file.content, "utf8");
    written.push(full);
  }
  return written;
}

function main(): void {
  const here = dirname(fileURLToPath(import.meta.url));
  const kbPath = process.env.RADZEN_KB_PATH ?? resolve(here, "..", "..", "component-knowledge.json");
  const outDir = resolve(process.argv[2] ?? "radzen-obsidian-vault");
  const kb = loadKnowledgeBase(kbPath);
  const written = writeVault(kb, outDir);
  console.log(`Wrote ${written.length} notes to ${outDir}`);
}

function isMainModule(): boolean {
  if (!process.argv[1]) return false;
  try {
    return realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url));
  } catch {
    return false;
  }
}

if (isMainModule()) main();
