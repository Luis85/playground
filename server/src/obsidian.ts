import type { ComponentInfo, KnowledgeBase } from "./types.ts";

const INDEX_TITLE = "Radzen Components";

export function relatedComponents(kb: KnowledgeBase, component: ComponentInfo): string[] {
  return kb.components
    .filter((c) => c.name !== component.name)
    .filter((c) => c.name.startsWith(component.name) || component.name.startsWith(c.name))
    .map((c) => c.name);
}

function escapeCell(text: string): string {
  return text.replace(/\|/g, "\\|").replace(/\n/g, " ");
}

function table(header: string[], rows: string[][]): string {
  if (rows.length === 0) return "_None._";
  const head = `| ${header.join(" | ")} |`;
  const sep = `| ${header.map(() => "---").join(" | ")} |`;
  const body = rows.map((r) => `| ${r.map(escapeCell).join(" | ")} |`).join("\n");
  return `${head}\n${sep}\n${body}`;
}

export function renderComponentNote(kb: KnowledgeBase, component: ComponentInfo): string {
  const alias = component.name.replace(/^Radzen/, "");
  const frontmatter = [
    "---",
    `title: ${component.name}`,
    `aliases: [${alias}]`,
    "type: radzen-component",
    `radzenVersion: ${kb.radzenVersion}`,
    `parameters: ${component.parameters.length}`,
    `events: ${component.events.length}`,
    "tags: [radzen, blazor, component]",
    "---",
  ].join("\n");

  const params = table(
    ["Name", "Type", "Default", "Description"],
    component.parameters.map((p) => [p.name, p.type, p.default ?? "—", p.description || "—"]),
  );
  const events = table(
    ["Name", "Type", "Description"],
    component.events.map((e) => [e.name, e.type, e.description || "—"]),
  );
  const related = relatedComponents(kb, component);
  const relatedBlock = related.length ? related.map((n) => `- [[${n}]]`).join("\n") : "_None._";

  return [
    frontmatter,
    `# ${component.name}`,
    component.summary || "_No summary available._",
    "## Parameters",
    params,
    "## Events",
    events,
    "## Related",
    relatedBlock,
    "---",
    `Back to [[${INDEX_TITLE}]]`,
    "",
  ].join("\n\n");
}

export function renderIndexNote(kb: KnowledgeBase): string {
  const frontmatter = [
    "---",
    `title: ${INDEX_TITLE}`,
    "type: radzen-index",
    `radzenVersion: ${kb.radzenVersion}`,
    `components: ${kb.components.length}`,
    "tags: [radzen, blazor, moc]",
    "---",
  ].join("\n");
  const list = [...kb.components]
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((c) => `- [[${c.name}]] — ${c.summary || ""}`.trimEnd())
    .join("\n");
  return [
    frontmatter,
    `# ${INDEX_TITLE}`,
    `Radzen Blazor component library (${kb.components.length} components, v${kb.radzenVersion}).`,
    list,
    "",
  ].join("\n\n");
}

export function buildVault(kb: KnowledgeBase): { path: string; content: string }[] {
  return [
    { path: `${INDEX_TITLE}.md`, content: renderIndexNote(kb) },
    ...kb.components.map((c) => ({
      path: `components/${c.name}.md`,
      content: renderComponentNote(kb, c),
    })),
  ];
}
