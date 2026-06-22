import type { ComponentInfo, KnowledgeBase } from "../types.ts";
import { suggestNames } from "../search.ts";

export function getComponent(kb: KnowledgeBase, name: string): ComponentInfo {
  const needle = name.toLowerCase().trim();
  const found = kb.components.find((c) => c.name.toLowerCase() === needle);
  if (!found) {
    const suggestions = suggestNames(kb, name, 3);
    const hint = suggestions.length
      ? ` Did you mean: ${suggestions.join(", ")}?`
      : " Call list_components to see available components.";
    throw new Error(`Unknown component "${name}".${hint}`);
  }
  return found;
}
