import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { RefletAdminClient } from "../client.js";
import { textResult } from "./utils.js";

export function registerScreenshotTools(
  server: McpServer,
  client: RefletAdminClient
): void {
  server.tool(
    "screenshot_list",
    "List all screenshots attached to a feedback item. Returns URLs, filenames, capture source, and metadata.",
    {
      feedbackId: z
        .string()
        .describe("The feedback ID to list screenshots for"),
    },
    async (params) =>
      textResult(await client.listScreenshots(params.feedbackId))
  );

  server.tool(
    "screenshot_delete",
    "Delete a screenshot from a feedback item. Removes both the file from storage and the metadata record.",
    {
      screenshotId: z.string().describe("The screenshot ID to delete"),
    },
    async (params) =>
      textResult(await client.deleteScreenshot(params.screenshotId))
  );
}
