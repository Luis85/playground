import type { ComponentInfo, KnowledgeBase } from "../types.ts";
import { getComponent } from "./getComponent.ts";
import { escapeAttr } from "../escape.ts";

// Razor directive attributes that are always legal on a component tag.
const RAZOR_DIRECTIVES = new Set(["@rendermode", "@ref", "@key", "@attributes"]);

// HTML pass-through attribute name (class, id, style, aria-*, data-*): lowercase,
// hyphens allowed. PascalCase parameter typos won't match, so they stay rejected.
const HTML_ATTRIBUTE = /^[a-z][a-z0-9-]*$/;

// A component has a catch-all if it exposes the Radzen `Attributes` parameter
// (CaptureUnmatchedValues), which renders arbitrary attributes onto the element.
function hasCatchAll(component: ComponentInfo): boolean {
  return component.parameters.some((p) => p.name === "Attributes" && /dictionary/i.test(p.type));
}

// A key is valid if it's a known parameter/event/type parameter, a Razor directive,
// `@bind-<param>` where the base is a real parameter, or — when the component has a
// catch-all — a plain HTML attribute name.
function isValidAttribute(key: string, valid: Set<string>, catchAll: boolean): boolean {
  if (RAZOR_DIRECTIVES.has(key)) return true;
  if (key.startsWith("@bind-")) return valid.has(key.slice("@bind-".length));
  if (valid.has(key)) return true;
  return catchAll && HTML_ATTRIBUTE.test(key);
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
  const catchAll = hasCatchAll(component);
  const invalid = Object.keys(options).filter((k) => !isValidAttribute(k, valid, catchAll));
  if (invalid.length > 0) {
    const extra = catchAll ? "" : " (this component has no catch-all for arbitrary HTML attributes)";
    throw new Error(
      `Invalid option(s) for ${component.name}: ${invalid.join(", ")}.${extra} ` +
        `Valid parameters/events: ${[...valid].join(", ")} (also @bind-<param> and @rendermode/@ref/@key/@attributes).`,
    );
  }
  const attrs = Object.entries(options)
    .map(([k, v]) => `${k}="${escapeAttr(v)}"`)
    .join(" ");
  return attrs ? `<${component.name} ${attrs} />` : `<${component.name} />`;
}
