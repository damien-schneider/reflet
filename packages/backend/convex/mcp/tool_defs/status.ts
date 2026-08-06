import { internal } from "../../_generated/api";
import { requireStr, str } from "../../http/helpers";
import { asId, createToolRegistry } from "../tool_registry";

const { defineTool, tools } = createToolRegistry();

defineTool(
  "status_list",
  "List all organization statuses used for roadmap columns (e.g., 'Planned', 'In Progress', 'Done').",
  { properties: {}, type: "object" },
  async (ctx, organizationId) =>
    ctx.runQuery(internal.admin_api.statuses.listStatuses, {
      organizationId,
    })
);

defineTool(
  "status_create",
  "Create a new organization status for the roadmap.",
  {
    properties: {
      color: { description: "Status color (hex or named)", type: "string" },
      icon: { description: "Status icon", type: "string" },
      name: {
        description: "Status name (e.g., 'In Review')",
        type: "string",
      },
    },
    required: ["name", "color"],
    type: "object",
  },
  async (ctx, organizationId, params) =>
    ctx.runMutation(internal.admin_api.statuses.createStatus, {
      color: requireStr(params.color, "color"),
      icon: str(params.icon),
      name: requireStr(params.name, "name"),
      organizationId,
    })
);

defineTool(
  "status_update",
  "Update an organization status's name, color, or icon.",
  {
    properties: {
      color: { description: "New color", type: "string" },
      icon: { description: "New icon", type: "string" },
      name: { description: "New name", type: "string" },
      statusId: { description: "The status ID", type: "string" },
    },
    required: ["statusId"],
    type: "object",
  },
  async (ctx, organizationId, params) =>
    ctx.runMutation(internal.admin_api.statuses.updateStatus, {
      color: str(params.color),
      icon: str(params.icon),
      name: str(params.name),
      organizationId,
      statusId: asId<"organizationStatuses">(params.statusId, "statusId"),
    })
);

defineTool(
  "status_delete",
  "Delete an organization status. Feedback using this status will be unset.",
  {
    properties: {
      statusId: {
        description: "The status ID to delete",
        type: "string",
      },
    },
    required: ["statusId"],
    type: "object",
  },
  async (ctx, organizationId, params) =>
    ctx.runMutation(internal.admin_api.statuses.deleteStatus, {
      organizationId,
      statusId: asId<"organizationStatuses">(params.statusId, "statusId"),
    })
);

export const statusTools = tools;
