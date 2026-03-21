import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { RefletAdminClient } from "../client.js";

function textResult(data: unknown): {
  content: { type: "text"; text: string }[];
} {
  return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
}

export function registerStatusTools(
  server: McpServer,
  client: RefletAdminClient
): void {
  server.tool(
    "status_list",
    "List all organization statuses used for roadmap columns (e.g., 'Planned', 'In Progress', 'Done').",
    {},
    async () => textResult(await client.listStatuses())
  );

  server.tool(
    "status_create",
    "Create a new organization status for the roadmap.",
    {
      name: z.string().describe("Status name (e.g., 'In Review')"),
      color: z.string().describe("Status color (hex or named)"),
      icon: z.string().optional().describe("Status icon"),
    },
    async (params) => textResult(await client.createStatus(params))
  );

  server.tool(
    "status_update",
    "Update an organization status's name, color, or icon.",
    {
      statusId: z.string().describe("The status ID"),
      name: z.string().optional().describe("New name"),
      color: z.string().optional().describe("New color"),
      icon: z.string().optional().describe("New icon"),
    },
    async (params) => textResult(await client.updateStatus(params))
  );

  server.tool(
    "status_delete",
    "Delete an organization status. Feedback using this status will be unset.",
    {
      statusId: z.string().describe("The status ID to delete"),
    },
    async ({ statusId }) => textResult(await client.deleteStatus(statusId))
  );
}
