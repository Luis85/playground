import type { ComponentInfo, KnowledgeBase } from "../types.ts";

export function searchComponents(kb: KnowledgeBase, query: string): ComponentInfo[] {
  const needle = query.toLowerCase().trim();
  if (!needle) return [];
  return kb.components.filter((c) => {
    if (c.name.toLowerCase().includes(needle)) return true;
    return c.parameters.some(
      (p) =>
        p.name.toLowerCase().includes(needle) ||
        p.description.toLowerCase().includes(needle),
    );
  });
}
