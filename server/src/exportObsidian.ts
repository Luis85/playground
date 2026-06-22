import { fileURLToPath } from "node:url";
import { dirname, resolve, join, sep } from "node:path";
import { mkdirSync, writeFileSync, realpathSync } from "node:fs";
import type { KnowledgeBase } from "./types.ts";
import { loadKnowledgeBase } from "./knowledge.ts";
import { buildVault } from "./obsidian.ts";
import { usageTopics, type UsageTopic } from "./usage/topics.ts";

export function writeVault(kb: KnowledgeBase, outDir: string, topics: UsageTopic[] = usageTopics): string[] {
  const written: string[] = [];
  const base = resolve(outDir);
  // Track basenames per directory to de-dupe collisions after sanitization.
  const seen = new Map<string, number>();
  for (const file of buildVault(kb, topics)) {
    let full = join(outDir, file.path);
    // Guard against path traversal: the resolved path must stay inside outDir.
    const resolvedFull = resolve(full);
    if (resolvedFull !== base && !resolvedFull.startsWith(base + sep)) {
      throw new Error(`Refusing to write outside output dir: ${file.path}`);
    }
    // De-dupe basename collisions by appending "-2", "-3", ...
    const count = seen.get(resolvedFull) ?? 0;
    seen.set(resolvedFull, count + 1);
    if (count > 0) {
      const dot = full.lastIndexOf(".");
      full = dot >= 0 ? `${full.slice(0, dot)}-${count + 1}${full.slice(dot)}` : `${full}-${count + 1}`;
    }
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
