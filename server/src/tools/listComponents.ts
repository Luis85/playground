import type { KnowledgeBase } from "../types.ts";

export function listComponents(
  kb: KnowledgeBase,
  filter?: string,
): { name: string; summary: string }[] {
  const needle = filter?.toLowerCase().trim();
  return kb.components
    .filter(
      (c) =>
        !needle ||
        c.name.toLowerCase().includes(needle) ||
        c.summary.toLowerCase().includes(needle),
    )
    .map((c) => ({ name: c.name, summary: c.summary }));
}
