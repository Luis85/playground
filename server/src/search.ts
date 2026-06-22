import Fuse from "fuse.js";
import type { ComponentInfo, KnowledgeBase } from "./types.ts";

export function createSearchIndex(kb: KnowledgeBase): Fuse<ComponentInfo> {
  return new Fuse(kb.components, {
    includeScore: true,
    threshold: 0.4,
    ignoreLocation: true,
    keys: [
      { name: "name", weight: 0.6 },
      { name: "parameters.name", weight: 0.2 },
      { name: "summary", weight: 0.1 },
      { name: "parameters.description", weight: 0.1 },
    ],
  });
}

export function fuzzySearch(kb: KnowledgeBase, query: string, limit = 25): ComponentInfo[] {
  if (!query.trim()) return [];
  return createSearchIndex(kb)
    .search(query, { limit })
    .map((r) => r.item);
}

export function suggestNames(kb: KnowledgeBase, name: string, n = 3): string[] {
  const fuse = new Fuse(kb.components, {
    keys: ["name"],
    threshold: 0.5,
    ignoreLocation: true,
  });
  return fuse.search(name, { limit: n }).map((r) => r.item.name);
}
