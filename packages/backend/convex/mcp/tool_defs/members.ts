import { internal } from "../../_generated/api";
import { requireStr } from "../../http/helpers";
import { asId, createToolRegistry } from "../tool_registry";

const { defineTool, tools } = createToolRegistry();

defineTool(
  "member_list",
  "List all members of the organization with their roles.",
  { properties: {}, type: "object" },
  async (ctx, organizationId) =>
    ctx.runQuery(internal.admin_api.members.listMembers, {
      organizationId,
    })
);

defineTool(
  "invitation_create",
  "Invite a new member to the organization by email.",
  {
    properties: {
      email: { description: "Email address to invite", type: "string" },
      role: {
        description: "Role for the new member",
        enum: ["admin", "member"],
        type: "string",
      },
    },
    required: ["email", "role"],
    type: "object",
  },
  async (ctx, organizationId, params) =>
    ctx.runMutation(internal.admin_api.members.createInvitation, {
      email: requireStr(params.email, "email"),
      organizationId,
      role: requireStr(params.role, "role") as "admin" | "member",
    })
);

defineTool(
  "invitation_cancel",
  "Cancel a pending invitation.",
  {
    properties: {
      invitationId: {
        description: "The invitation ID to cancel",
        type: "string",
      },
    },
    required: ["invitationId"],
    type: "object",
  },
  async (ctx, organizationId, params) =>
    ctx.runMutation(internal.admin_api.members.cancelInvitation, {
      invitationId: asId<"invitations">(params.invitationId, "invitationId"),
      organizationId,
    })
);

defineTool(
  "invitation_list",
  "List all pending invitations for the organization.",
  { properties: {}, type: "object" },
  async (ctx, organizationId) =>
    ctx.runQuery(internal.admin_api.members.listInvitations, {
      organizationId,
    })
);

export const memberTools = tools;
