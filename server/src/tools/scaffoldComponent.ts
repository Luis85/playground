import type { KnowledgeBase } from "../types.ts";
import { getComponent } from "./getComponent.ts";

export function scaffoldComponent(
  kb: KnowledgeBase,
  name: string,
  options: Record<string, string> = {},
): string {
  const component = getComponent(kb, name); // throws on unknown component
  const valid = new Set(component.parameters.map((p) => p.name));
  const invalid = Object.keys(options).filter((k) => !valid.has(k));
  if (invalid.length > 0) {
    throw new Error(
      `Invalid option(s) for ${component.name}: ${invalid.join(", ")}. ` +
        `Valid parameters: ${[...valid].join(", ")}.`,
    );
  }
  const attrs = Object.entries(options)
    .map(([k, v]) => `${k}="${v}"`)
    .join(" ");
  return attrs ? `<${component.name} ${attrs} />` : `<${component.name} />`;
}
