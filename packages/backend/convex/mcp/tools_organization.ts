import { internal } from "../_generated/api";
import { bool, requireStr, str } from "../http/helpers";
import type { ToolRegistration } from "./tools_shared";
import { asId, defineTool } from "./tools_shared";

export const organizationTools: ToolRegistration[] = [
  // --- Status tools ---

  defineTool(
    "status_list",
    "List all organization statuses used for roadmap columns (e.g., 'Planned', 'In Progress', 'Done').",
    { type: "object", properties: {} },
    async (ctx, organizationId) =>
      ctx.runQuery(internal.admin_api.statuses.listStatuses, {
        organizationId,
      })
  ),

  defineTool(
    "status_create",
    "Create a new organization status for the roadmap.",
    {
      type: "object",
      properties: {
        name: {
          type: "string",
          description: "Status name (e.g., 'In Review')",
        },
        color: { type: "string", description: "Status color (hex or named)" },
        icon: { type: "string", description: "Status icon" },
      },
      required: ["name", "color"],
    },
    async (ctx, organizationId, params) =>
      ctx.runMutation(internal.admin_api.statuses.createStatus, {
        organizationId,
        name: requireStr(params.name, "name"),
        color: requireStr(params.color, "color"),
        icon: str(params.icon),
      })
  ),

  defineTool(
    "status_update",
    "Update an organization status's name, color, or icon.",
    {
      type: "object",
      properties: {
        statusId: { type: "string", description: "The status ID" },
        name: { type: "string", description: "New name" },
        color: { type: "string", description: "New color" },
        icon: { type: "string", description: "New icon" },
      },
      required: ["statusId"],
    },
    async (ctx, organizationId, params) =>
      ctx.runMutation(internal.admin_api.statuses.updateStatus, {
        organizationId,
        statusId: asId<"organizationStatuses">(params.statusId, "statusId"),
        name: str(params.name),
        color: str(params.color),
        icon: str(params.icon),
      })
  ),

  defineTool(
    "status_delete",
    "Delete an organization status. Feedback using this status will be unset.",
    {
      type: "object",
      properties: {
        statusId: {
          type: "string",
          description: "The status ID to delete",
        },
      },
      required: ["statusId"],
    },
    async (ctx, organizationId, params) =>
      ctx.runMutation(internal.admin_api.statuses.deleteStatus, {
        organizationId,
        statusId: asId<"organizationStatuses">(params.statusId, "statusId"),
      })
  ),

  // --- Member & invitation tools ---

  defineTool(
    "member_list",
    "List all members of the organization with their roles.",
    { type: "object", properties: {} },
    async (ctx, organizationId) =>
      ctx.runQuery(internal.admin_api.members.listMembers, {
        organizationId,
      })
  ),

  defineTool(
    "invitation_create",
    "Invite a new member to the organization by email.",
    {
      type: "object",
      properties: {
        email: { type: "string", description: "Email address to invite" },
        role: {
          type: "string",
          enum: ["admin", "member"],
          description: "Role for the new member",
        },
      },
      required: ["email", "role"],
    },
    async (ctx, organizationId, params) =>
      ctx.runMutation(internal.admin_api.members.createInvitation, {
        organizationId,
        email: requireStr(params.email, "email"),
        role: requireStr(params.role, "role") as "admin" | "member",
      })
  ),

  defineTool(
    "invitation_cancel",
    "Cancel a pending invitation.",
    {
      type: "object",
      properties: {
        invitationId: {
          type: "string",
          description: "The invitation ID to cancel",
        },
      },
      required: ["invitationId"],
    },
    async (ctx, organizationId, params) =>
      ctx.runMutation(internal.admin_api.members.cancelInvitation, {
        organizationId,
        invitationId: asId<"invitations">(params.invitationId, "invitationId"),
      })
  ),

  defineTool(
    "invitation_list",
    "List all pending invitations for the organization.",
    { type: "object", properties: {} },
    async (ctx, organizationId) =>
      ctx.runQuery(internal.admin_api.members.listInvitations, {
        organizationId,
      })
  ),

  // --- Organization & roadmap tools ---

  defineTool(
    "org_get",
    "Get the organization's information and settings.",
    { type: "object", properties: {} },
    async (ctx, organizationId) =>
      ctx.runQuery(internal.admin_api.organization.getOrganization, {
        organizationId,
      })
  ),

  defineTool(
    "org_update",
    "Update organization settings like name, visibility, branding, or support.",
    {
      type: "object",
      properties: {
        name: { type: "string", description: "Organization name" },
        isPublic: {
          type: "boolean",
          description: "Whether the feedback board is publicly accessible",
        },
        primaryColor: { type: "string", description: "Brand color (hex)" },
        supportEnabled: {
          type: "boolean",
          description: "Whether the support/help desk feature is enabled",
        },
      },
    },
    async (ctx, organizationId, params) =>
      ctx.runMutation(internal.admin_api.organization.updateOrganization, {
        organizationId,
        name: str(params.name),
        isPublic: bool(params.isPublic),
        primaryColor: str(params.primaryColor),
        supportEnabled: bool(params.supportEnabled),
      })
  ),

  defineTool(
    "roadmap_get",
    "Get the public roadmap organized by status columns with feedback items in each.",
    { type: "object", properties: {} },
    async (ctx, organizationId) =>
      ctx.runQuery(
        internal.feedback.api_public_reads.getRoadmapByOrganization,
        {
          organizationId,
        }
      )
  ),
];
