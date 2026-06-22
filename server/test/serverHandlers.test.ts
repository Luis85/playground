import { test } from "node:test";
import assert from "node:assert/strict";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { createServer } from "../src/server.ts";
import type { KnowledgeBase } from "../src/types.ts";

const kb: KnowledgeBase = {
  radzenVersion: "5.9.9.0",
  components: [
    {
      name: "RadzenDataGrid",
      summary: "A data grid.",
      typeParameters: ["TItem"],
      parameters: [{ name: "Data", type: "IEnumerable", default: null, description: "The data source." }],
      events: [{ name: "RowSelect", type: "EventCallback<T>", description: "Row selected." }],
    },
  ],
};

async function connectClient() {
  const server = createServer(kb);
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  const client = new Client({ name: "test-client", version: "0.0.0" });
  await Promise.all([client.connect(clientTransport), server.connect(serverTransport)]);
  return client;
}

test("get_component returns usageTopics in its payload for a known component", async () => {
  const client = await connectClient();
  const res = await client.callTool({ name: "get_component", arguments: { name: "RadzenDataGrid" } });
  assert.notEqual(res.isError, true);
  const text = (res.content as { type: string; text: string }[])[0].text;
  const payload = JSON.parse(text);
  assert.equal(payload.name, "RadzenDataGrid");
  assert.ok("usageTopics" in payload, "payload should include usageTopics");
  await client.close();
});

test("get_component for an unknown component returns isError: true", async () => {
  const client = await connectClient();
  const res = await client.callTool({ name: "get_component", arguments: { name: "RadzenNope" } });
  assert.equal(res.isError, true);
  await client.close();
});
