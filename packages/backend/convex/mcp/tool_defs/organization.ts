import { internal } from "../../_generated/api";
import { bool, str } from "../../http/helpers";
import { createToolRegistry } from "../tool_registry";

const { defineTool, tools } = createToolRegistry();

defineTool(
  "org_get",
  "Get the organization's information and settings.",
  { properties: {}, type: "object" },
  async (ctx, organizationId) =>
    ctx.runQuery(internal.admin_api.organization.getOrganization, {
      organizationId,
    })
);

defineTool(
  "org_update",
  "Update organization settings like name, visibility, branding, or support.",
  {
    properties: {
      isPublic: {
        description: "Whether the feedback board is publicly accessible",
        type: "boolean",
      },
      name: { description: "Organization name", type: "string" },
      primaryColor: { description: "Brand color (hex)", type: "string" },
      supportEnabled: {
        description: "Whether the support/help desk feature is enabled",
        type: "boolean",
      },
    },
    type: "object",
  },
  async (ctx, organizationId, params) =>
    ctx.runMutation(internal.admin_api.organization.updateOrganization, {
      isPublic: bool(params.isPublic),
      name: str(params.name),
      organizationId,
      primaryColor: str(params.primaryColor),
      supportEnabled: bool(params.supportEnabled),
    })
);

defineTool(
  "roadmap_get",
  "Get the public roadmap organized by status columns with feedback items in each.",
  { properties: {}, type: "object" },
  async (ctx, organizationId) =>
    ctx.runQuery(internal.feedback.api_public.getRoadmapByOrganization, {
      organizationId,
    })
);

export const organizationTools = tools;
