import type { ComponentInfo } from "./types.ts";

export type ResponseFormat = "concise" | "detailed";

export function formatComponent(component: ComponentInfo, format: ResponseFormat): unknown {
  if (format === "detailed") return component;
  return {
    name: component.name,
    summary: component.summary,
    parameters: component.parameters.map((p) => p.name),
    events: component.events.map((e) => e.name),
  };
}
