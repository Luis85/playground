import { templates, type Template, type TemplateOption } from "../templates/templates.ts";
import { escapeAttr } from "../escape.ts";
import { suggest } from "../search.ts";

export interface TemplateSummary {
  id: string;
  title: string;
  summary: string;
  options: TemplateOption[];
}

export function listTemplates(): TemplateSummary[] {
  return templates.map(({ id, title, summary, options }) => ({ id, title, summary, options }));
}

export function scaffoldTemplate(templateId: string, options: Record<string, string> = {}): string {
  const needle = templateId.toLowerCase().trim();
  const template: Template | undefined = templates.find((t) => t.id.toLowerCase() === needle);
  if (!template) {
    const suggestions = suggest(templates, ["id", "title"], templateId, 3);
    const hint = suggestions.length
      ? ` Did you mean: ${suggestions.join(", ")}?`
      : " Call list_templates to see available templates.";
    throw new Error(`Unknown template "${templateId}".${hint}`);
  }
  const allowed = new Set(template.options.map((o) => o.name));
  const invalid = Object.keys(options).filter((k) => !allowed.has(k));
  if (invalid.length > 0) {
    throw new Error(
      `Invalid option(s) for template "${template.id}": ${invalid.join(", ")}. ` +
        `Valid options: ${[...allowed].join(", ")}.`,
    );
  }
  const resolved: Record<string, string> = {};
  // Escape option values — they are interpolated into attribute values in markup.
  for (const o of template.options) resolved[o.name] = escapeAttr(options[o.name] ?? o.default);
  return template.render(resolved);
}
