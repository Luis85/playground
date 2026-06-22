import Fuse from "fuse.js";
import { usageTopics, type UsageTopic } from "../usage/topics.ts";

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

  const suggestions = new Fuse(usageTopics, { keys: ["id", "title"], threshold: 0.5, ignoreLocation: true })
    .search(topicId, { limit: 3 })
    .map((r) => r.item.id);
  const hint = suggestions.length
    ? ` Did you mean: ${suggestions.join(", ")}?`
    : " Call list_usage_topics to see available topics.";
  throw new Error(`Unknown usage topic "${topicId}".${hint}`);
}
