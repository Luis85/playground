import type { KnowledgeBase } from "../types.ts";
import { getComponent } from "./getComponent.ts";
import { escapeAttr } from "../escape.ts";

// Razor directive attributes that are always legal on a component tag.
const RAZOR_DIRECTIVES = new Set(["@rendermode", "@ref", "@key", "@attributes"]);

// A directive/attribute key is valid if it is a known parameter/event/type
// parameter, a known Razor directive, or `@bind-<X>` where X is a real parameter.
function isValidAttribute(key: string, valid: Set<string>): boolean {
  if (RAZOR_DIRECTIVES.has(key)) return true;
  if (key.startsWith("@bind-")) return valid.has(key.slice("@bind-".length));
  return valid.has(key);
}

export function scaffoldComponent(
  kb: KnowledgeBase,
  name: string,
  options: Record<string, string> = {},
): string {
  const component = getComponent(kb, name); // throws on unknown component
  // Valid attributes: [Parameter] properties, event callbacks, and Razor generic
  // type parameters (e.g. TItem on RadzenDataGrid<TItem>) — all legal on the tag.
  const valid = new Set([
    ...component.parameters.map((p) => p.name),
    ...component.events.map((e) => e.name),
    ...(component.typeParameters ?? []),
  ]);
  const invalid = Object.keys(options).filter((k) => !isValidAttribute(k, valid));
  if (invalid.length > 0) {
    throw new Error(
      `Invalid option(s) for ${component.name}: ${invalid.join(", ")}. ` +
        `Valid parameters/events: ${[...valid].join(", ")} (also @bind-<param> and @rendermode/@ref/@key/@attributes).`,
    );
  }
  const attrs = Object.entries(options)
    .map(([k, v]) => `${k}="${escapeAttr(v)}"`)
    .join(" ");
  return attrs ? `<${component.name} ${attrs} />` : `<${component.name} />`;
}
