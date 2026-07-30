import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { RefletAdminClient } from "../client.js";
import { textResult } from "./utils.js";

export function registerTagTools(
  server: McpServer,
  client: RefletAdminClient
): void {
  server.tool(
    "tag_list",
    "List all tags in the organization. Tags are used to categorize feedback items.",
    {},
    async () => textResult(await client.listTags())
  );

  server.tool(
    "tag_create",
    "Create a new tag for categorizing feedback.",
    {
      color: z.string().describe("Tag color (e.g., 'blue', 'red', 'green')"),
      description: z.string().optional().describe("Tag description"),
      icon: z.string().optional().describe("Emoji icon (e.g., '🔥', '📦')"),
      isPublic: z
        .boolean()
        .optional()
        .describe("Whether the tag is visible in the public widget"),
      name: z.string().describe("Tag name"),
    },
    async (params) => textResult(await client.createTag(params))
  );

  server.tool(
    "tag_update",
    "Update an existing tag's properties.",
    {
      color: z.string().optional().describe("New tag color"),
      description: z.string().optional().describe("New description"),
      icon: z.string().optional().describe("New emoji icon"),
      isPublic: z
        .boolean()
        .optional()
        .describe("Whether the tag is visible in the public widget"),
      name: z.string().optional().describe("New tag name"),
      tagId: z.string().describe("The tag ID"),
    },
    async (params) => textResult(await client.updateTag(params))
  );

  server.tool(
    "tag_delete",
    "Delete a tag. This will remove the tag from all feedback items.",
    {
      tagId: z.string().describe("The tag ID to delete"),
    },
    async ({ tagId }) => textResult(await client.deleteTag(tagId))
  );
}
