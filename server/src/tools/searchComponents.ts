import type { ComponentInfo, KnowledgeBase } from "../types.ts";
import { fuzzySearch } from "../search.ts";

export function searchComponents(kb: KnowledgeBase, query: string): ComponentInfo[] {
  return fuzzySearch(kb, query);
}
