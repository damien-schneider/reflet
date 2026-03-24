import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { RefletAdminClient } from "../client.js";
import { textResult } from "./utils.js";

export function registerReleaseTools(
  server: McpServer,
  client: RefletAdminClient
): void {
  server.tool(
    "release_list",
    "List releases (changelog entries). Filter by draft/published status.",
    {
      status: z
        .enum(["draft", "published", "all"])
        .optional()
        .describe("Filter by publish status (default: all)"),
      limit: z.number().optional().describe("Max items to return"),
      offset: z.number().optional().describe("Pagination offset"),
    },
    async (params) => textResult(await client.listReleases(params))
  );

  server.tool(
    "release_get",
    "Get a single release with its linked feedback items.",
    {
      releaseId: z.string().describe("The release ID"),
    },
    async ({ releaseId }) => textResult(await client.getRelease(releaseId))
  );

  server.tool(
    "release_create",
    "Create a new draft release (changelog entry).",
    {
      title: z.string().describe("Release title"),
      description: z
        .string()
        .optional()
        .describe("Release description/notes (rich text or markdown)"),
      version: z
        .string()
        .optional()
        .describe("Version string (e.g., 'v1.2.0')"),
    },
    async (params) => textResult(await client.createRelease(params))
  );

  server.tool(
    "release_update",
    "Update a release's title, description, or version.",
    {
      releaseId: z.string().describe("The release ID"),
      title: z.string().optional().describe("New title"),
      description: z.string().optional().describe("New description/notes"),
      version: z.string().optional().describe("New version string"),
    },
    async (params) => textResult(await client.updateRelease(params))
  );

  server.tool(
    "release_publish",
    "Publish a draft release, making it visible in the public changelog.",
    {
      releaseId: z.string().describe("The release ID to publish"),
    },
    async ({ releaseId }) => textResult(await client.publishRelease(releaseId))
  );

  server.tool(
    "release_unpublish",
    "Unpublish a release, returning it to draft status.",
    {
      releaseId: z.string().describe("The release ID to unpublish"),
    },
    async ({ releaseId }) =>
      textResult(await client.unpublishRelease(releaseId))
  );

  server.tool(
    "release_delete",
    "Delete a release entirely.",
    {
      releaseId: z.string().describe("The release ID to delete"),
    },
    async ({ releaseId }) => textResult(await client.deleteRelease(releaseId))
  );

  server.tool(
    "release_link_feedback",
    "Link or unlink a feedback item to/from a release.",
    {
      releaseId: z.string().describe("The release ID"),
      feedbackId: z.string().describe("The feedback item ID"),
      action: z.enum(["link", "unlink"]).describe("Whether to link or unlink"),
    },
    async ({ releaseId, feedbackId, action }) =>
      textResult(
        await client.linkReleaseFeedback(releaseId, feedbackId, action)
      )
  );

  server.tool(
    "release_schedule",
    "Schedule a draft release for future publication. Provide a Unix timestamp (milliseconds) for the publish time.",
    {
      releaseId: z.string().describe("The release ID to schedule"),
      scheduledPublishAt: z
        .number()
        .describe("Unix timestamp in milliseconds for when to publish"),
      feedbackStatus: z
        .enum([
          "open",
          "under_review",
          "planned",
          "in_progress",
          "completed",
          "closed",
        ])
        .optional()
        .describe(
          "Status to set on linked feedback items when the release publishes"
        ),
    },
    async (params) => textResult(await client.scheduleRelease(params))
  );

  server.tool(
    "release_cancel_schedule",
    "Cancel a scheduled release, returning it to draft status.",
    {
      releaseId: z.string().describe("The release ID to cancel scheduling for"),
    },
    async ({ releaseId }) =>
      textResult(await client.cancelScheduledRelease(releaseId))
  );
}
