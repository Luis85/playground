import type { ComponentInfo, KnowledgeBase } from "../types.ts";

export function getComponent(kb: KnowledgeBase, name: string): ComponentInfo {
  const needle = name.toLowerCase().trim();
  const found = kb.components.find((c) => c.name.toLowerCase() === needle);
  if (!found) {
    throw new Error(`Unknown component "${name}". Call list_components to see available components.`);
  }
  return found;
}
