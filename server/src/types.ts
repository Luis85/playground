export interface ParameterInfo {
  name: string;
  type: string;
  default: string | null;
  description: string;
}

export interface EventInfo {
  name: string;
  type: string;
  description: string;
}

export interface ComponentInfo {
  name: string;
  summary: string;
  parameters: ParameterInfo[];
  events: EventInfo[];
}

export interface KnowledgeBase {
  radzenVersion: string;
  components: ComponentInfo[];
}
