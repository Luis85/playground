import { readFileSync } from "node:fs";
import { z } from "zod";
import type { KnowledgeBase } from "./types.ts";

const parameterSchema = z.object({
  name: z.string(),
  type: z.string(),
  default: z.string().nullable(),
  description: z.string(),
});

const eventSchema = z.object({
  name: z.string(),
  type: z.string(),
  description: z.string(),
});

const componentSchema = z.object({
  name: z.string(),
  summary: z.string(),
  typeParameters: z.array(z.string()).default([]),
  parameters: z.array(parameterSchema),
  events: z.array(eventSchema),
});

const knowledgeBaseSchema = z.object({
  radzenVersion: z.string().min(1),
  components: z.array(componentSchema).min(1),
});

export function loadKnowledgeBase(path: string): KnowledgeBase {
  let raw: string;
  try {
    raw = readFileSync(path, "utf8");
  } catch (err) {
    throw new Error(`Could not read knowledge base at ${path}: ${(err as Error).message}`);
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    throw new Error(`Knowledge base at ${path} is not valid JSON: ${(err as Error).message}`);
  }
  const result = knowledgeBaseSchema.safeParse(parsed);
  if (!result.success) {
    throw new Error(`Knowledge base at ${path} has an invalid shape: ${result.error.message}`);
  }
  return result.data;
}
