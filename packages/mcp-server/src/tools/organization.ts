import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { RefletAdminClient } from "../client.js";
import { textResult } from "./utils.js";

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
    "Update organization settings like name, visibility, branding, or support.",
    {
      name: z.string().optional().describe("Organization name"),
      isPublic: z
        .boolean()
        .optional()
        .describe("Whether the feedback board is publicly accessible"),
      primaryColor: z.string().optional().describe("Brand color (hex)"),
      supportEnabled: z
        .boolean()
        .optional()
        .describe("Whether the support/help desk feature is enabled"),
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
