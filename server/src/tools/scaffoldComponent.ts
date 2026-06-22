import type { KnowledgeBase } from "../types.ts";
import { getComponent } from "./getComponent.ts";

// HTML-escape an attribute value so quotes/markup characters can't break out of
// the generated tag or splice in unintended attributes.
function escapeAttr(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export function scaffoldComponent(
  kb: KnowledgeBase,
  name: string,
  options: Record<string, string> = {},
): string {
  const component = getComponent(kb, name); // throws on unknown component
  // Both parameters and event callbacks are legal Razor component attributes
  // (e.g. Text="..." and Click="@OnClick"), so both are valid option keys.
  const valid = new Set([
    ...component.parameters.map((p) => p.name),
    ...component.events.map((e) => e.name),
  ]);
  const invalid = Object.keys(options).filter((k) => !valid.has(k));
  if (invalid.length > 0) {
    throw new Error(
      `Invalid option(s) for ${component.name}: ${invalid.join(", ")}. ` +
        `Valid parameters/events: ${[...valid].join(", ")}.`,
    );
  }
  const attrs = Object.entries(options)
    .map(([k, v]) => `${k}="${escapeAttr(v)}"`)
    .join(" ");
  return attrs ? `<${component.name} ${attrs} />` : `<${component.name} />`;
}
