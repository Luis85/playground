import { usageTopics, type UsageTopic } from "../usage/topics.ts";
import { suggest } from "../search.ts";

export interface UsageTopicSummary {
  id: string;
  title: string;
  summary: string;
  components: string[];
}

export function listUsageTopics(): UsageTopicSummary[] {
  return usageTopics.map(({ id, title, summary, components }) => ({ id, title, summary, components }));
}

export function getUsage(topicId: string): UsageTopic {
  const needle = topicId.toLowerCase().trim();
  const found = usageTopics.find((t) => t.id.toLowerCase() === needle);
  if (found) return found;

  const suggestions = suggest(usageTopics, ["id", "title"], topicId, 3);
  const hint = suggestions.length
    ? ` Did you mean: ${suggestions.join(", ")}?`
    : " Call list_usage_topics to see available topics.";
  throw new Error(`Unknown usage topic "${topicId}".${hint}`);
}

/** Ids of usage topics whose related components include the given component. */
export function usageTopicsForComponent(componentName: string): string[] {
  const needle = componentName.toLowerCase();
  return usageTopics
    .filter((t) => t.components.some((c) => c.toLowerCase() === needle))
    .map((t) => t.id);
}
