import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { RefletAdminClient } from "../client.js";

function textResult(data: unknown): {
  content: { type: "text"; text: string }[];
} {
  return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
}

export function registerOrganizationTools(
  server: McpServer,
  client: RefletAdminClient
): void {
  server.tool(
    "org_get",
    "Get the organization's information and settings.",
    {},
    async () => textResult(await client.getOrganization())
  );

  server.tool(
    "org_update",
    "Update organization settings like name, slug, visibility, or branding.",
    {
      name: z.string().optional().describe("Organization name"),
      slug: z.string().optional().describe("URL slug for the organization"),
      isPublic: z
        .boolean()
        .optional()
        .describe("Whether the feedback board is publicly accessible"),
      primaryColor: z.string().optional().describe("Brand color (hex)"),
    },
    async (params) => textResult(await client.updateOrganization(params))
  );

  server.tool(
    "roadmap_get",
    "Get the public roadmap organized by status columns with feedback items in each.",
    {},
    async () => textResult(await client.getRoadmap())
  );
}
