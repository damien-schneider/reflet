import { BASE_URL } from "@/lib/seo-config";

export const DOCUMENTATION_SERVER = {
  name: "app.reflet/documentation",
  title: "Reflet documentation",
  version: "1.0.0",
};
export const MCP_ENDPOINT = new URL("/api/mcp", BASE_URL).href;
export const MCP_CARD = {
  $schema:
    "https://static.modelcontextprotocol.io/schemas/v1/server-card.schema.json",
  ...DOCUMENTATION_SERVER,
  description:
    "Read public Reflet product information, authentication guidance, and integration instructions.",
  remotes: [{ type: "streamable-http", url: MCP_ENDPOINT }],
  websiteUrl: BASE_URL,
};

export const LEGACY_MCP_CARD = {
  capabilities: { resources: {}, tools: {} },
  description: MCP_CARD.description,
  serverInfo: DOCUMENTATION_SERVER,
  transport: { endpoint: MCP_ENDPOINT, type: "streamable-http" },
};
