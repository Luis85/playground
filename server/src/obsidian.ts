import type { ComponentInfo, KnowledgeBase } from "./types.ts";
import { usageTopics as defaultTopics, type UsageTopic } from "./usage/topics.ts";

const INDEX_TITLE = "Radzen Components";

/**
 * Sanitize a string into a safe note basename/wikilink text. The same function
 * feeds BOTH the file basename and the [[wikilink]] so they always match.
 * Strips/replaces path-unsafe and control chars with "-", rejects "..", and
 * collapses whitespace.
 */
export function noteName(s: string): string {
  const cleaned = s
    // Replace path-unsafe characters and ASCII control chars with "-".
    // eslint-disable-next-line no-control-regex
    .replace(/[\\/:*?"<>|\x00-\x1f]/g, "-")
    .replace(/\s+/g, " ")
    .trim();
  if (cleaned === ".." || cleaned === "" || cleaned === ".") return "-";
  return cleaned;
}

/** Quote a YAML scalar so values containing ":" or other specials are safe. */
function yamlQuote(value: string): string {
  return `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

export function relatedComponents(kb: KnowledgeBase, component: ComponentInfo): string[] {
  return kb.components
    .filter((c) => c.name !== component.name)
    .filter((c) => c.name.startsWith(component.name) || component.name.startsWith(c.name))
    .map((c) => c.name);
}

/** Usage topics whose related components include this component. */
function usageForComponent(component: ComponentInfo, topics: UsageTopic[]): UsageTopic[] {
  return topics.filter((t) => t.components.includes(component.name));
}

function escapeCell(text: string): string {
  // Escape backslash FIRST so the pipe-escaping backslashes aren't double-escaped,
  // then escape table-cell pipes, then flatten any newlines to a space.
  return text
    .replace(/\\/g, "\\\\")
    .replace(/\|/g, "\\|")
    .replace(/\r\n|\r|\n/g, " ");
}

function table(header: string[], rows: string[][]): string {
  if (rows.length === 0) return "_None._";
  const head = `| ${header.join(" | ")} |`;
  const sep = `| ${header.map(() => "---").join(" | ")} |`;
  const body = rows.map((r) => `| ${r.map(escapeCell).join(" | ")} |`).join("\n");
  return `${head}\n${sep}\n${body}`;
}

function block(items: string[]): string {
  // Sanitize link targets with noteName so they match the note basenames on disk.
  return items.length ? items.map((n) => `- [[${noteName(n)}]]`).join("\n") : "_None._";
}

export function renderComponentNote(
  kb: KnowledgeBase,
  component: ComponentInfo,
  topics: UsageTopic[] = defaultTopics,
): string {
  const alias = component.name.replace(/^Radzen/, "");
  const frontmatter = [
    "---",
    `title: ${yamlQuote(component.name)}`,
    `aliases: [${yamlQuote(alias)}]`,
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

  return [
    frontmatter,
    `# ${component.name}`,
    component.summary || "_No summary available._",
    "## Parameters",
    params,
    "## Events",
    events,
    "## Related components",
    block(relatedComponents(kb, component)),
    "## Usage guides",
    block(usageForComponent(component, topics).map((t) => t.title)),
    "---",
    `Back to [[${INDEX_TITLE}]]`,
    "",
  ].join("\n\n");
}

export function renderUsageNote(topic: UsageTopic): string {
  const frontmatter = [
    "---",
    `title: ${yamlQuote(topic.title)}`,
    "type: radzen-usage",
    `topicId: ${yamlQuote(topic.id)}`,
    "tags: [radzen, blazor, usage]",
    "---",
  ].join("\n");
  return [
    frontmatter,
    topic.markdown,
    "## Related components",
    block(topic.components),
    "---",
    `Back to [[${INDEX_TITLE}]]`,
    "",
  ].join("\n\n");
}

export function renderIndexNote(kb: KnowledgeBase, topics: UsageTopic[] = defaultTopics): string {
  const frontmatter = [
    "---",
    `title: ${yamlQuote(INDEX_TITLE)}`,
    "type: radzen-index",
    `radzenVersion: ${kb.radzenVersion}`,
    `components: ${kb.components.length}`,
    "tags: [radzen, blazor, moc]",
    "---",
  ].join("\n");
  const componentList = [...kb.components]
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((c) => `- [[${noteName(c.name)}]] — ${c.summary || ""}`.trimEnd())
    .join("\n");
  const usageList = topics.map((t) => `- [[${noteName(t.title)}]] — ${t.summary}`).join("\n");
  return [
    frontmatter,
    `# ${INDEX_TITLE}`,
    `Radzen Blazor component library (${kb.components.length} components, v${kb.radzenVersion}).`,
    "## Usage guides",
    usageList,
    "## Components",
    componentList,
    "",
  ].join("\n\n");
}

export function buildVault(
  kb: KnowledgeBase,
  topics: UsageTopic[] = defaultTopics,
): { path: string; content: string }[] {
  return [
    { path: `${INDEX_TITLE}.md`, content: renderIndexNote(kb, topics) },
    ...kb.components.map((c) => ({
      path: `components/${noteName(c.name)}.md`,
      content: renderComponentNote(kb, c, topics),
    })),
    ...topics.map((t) => ({
      path: `usage/${noteName(t.title)}.md`,
      content: renderUsageNote(t),
    })),
  ];
}
