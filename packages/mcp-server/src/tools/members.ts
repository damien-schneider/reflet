import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { RefletAdminClient } from "../client.js";
import { textResult } from "./utils.js";

export function registerMemberTools(
  server: McpServer,
  client: RefletAdminClient
): void {
  server.tool(
    "member_list",
    "List all members of the organization with their roles.",
    {},
    async () => textResult(await client.listMembers())
  );

  server.tool(
    "invitation_create",
    "Invite a new member to the organization by email.",
    {
      email: z.string().describe("Email address to invite"),
      role: z.enum(["admin", "member"]).describe("Role for the new member"),
    },
    async (params) => textResult(await client.createInvitation(params))
  );

  server.tool(
    "invitation_cancel",
    "Cancel a pending invitation.",
    {
      invitationId: z.string().describe("The invitation ID to cancel"),
    },
    async ({ invitationId }) =>
      textResult(await client.cancelInvitation(invitationId))
  );

  server.tool(
    "invitation_list",
    "List all pending invitations for the organization.",
    {},
    async () => textResult(await client.listInvitations())
  );
}
