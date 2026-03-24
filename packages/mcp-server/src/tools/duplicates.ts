import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { RefletAdminClient } from "../client.js";
import { textResult } from "./utils.js";

export function registerDuplicateTools(
  server: McpServer,
  client: RefletAdminClient
): void {
  server.tool(
    "duplicate_list",
    "List pending duplicate feedback pairs detected by AI. Each pair shows two similar feedback items with a similarity score.",
    {},
    async () => textResult(await client.listPendingDuplicates())
  );

  server.tool(
    "duplicate_resolve",
    "Resolve a duplicate pair by confirming or rejecting it. Use 'confirm' to mark as true duplicates or 'reject' to dismiss.",
    {
      pairId: z.string().describe("The duplicate pair ID"),
      action: z
        .enum(["confirm", "reject"])
        .describe("Whether to confirm or reject the duplicate pair"),
    },
    async (params) => textResult(await client.resolveDuplicate(params))
  );

  server.tool(
    "duplicate_merge",
    "Merge two feedback items. Transfers votes, subscriptions from source to target. Source is marked as merged and hidden from lists.",
    {
      sourceFeedbackId: z
        .string()
        .describe("The feedback ID to merge FROM (will be hidden)"),
      targetFeedbackId: z
        .string()
        .describe("The feedback ID to merge INTO (will receive votes)"),
      pairId: z
        .string()
        .optional()
        .describe("Optional duplicate pair ID to mark as resolved"),
    },
    async (params) => textResult(await client.mergeFeedback(params))
  );
}
