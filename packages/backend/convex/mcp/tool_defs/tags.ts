import { internal } from "../../_generated/api";
import { bool, requireStr, str } from "../../http/helpers";
import { asId, createToolRegistry } from "../tool_registry";

const { defineTool, tools } = createToolRegistry();

defineTool(
  "tag_list",
  "List all tags in the organization. Tags are used to categorize feedback items.",
  { properties: {}, type: "object" },
  async (ctx, organizationId) =>
    ctx.runQuery(internal.admin_api.tags.listTags, { organizationId })
);

defineTool(
  "tag_create",
  "Create a new tag for categorizing feedback.",
  {
    properties: {
      color: {
        description: "Tag color (e.g., 'blue', 'red', 'green')",
        type: "string",
      },
      description: { description: "Tag description", type: "string" },
      icon: { description: "Emoji icon (e.g., fire, box)", type: "string" },
      isPublic: {
        description: "Whether the tag is visible in the public widget",
        type: "boolean",
      },
      name: { description: "Tag name", type: "string" },
    },
    required: ["name", "color"],
    type: "object",
  },
  async (ctx, organizationId, params) =>
    ctx.runMutation(internal.admin_api.tags.createTag, {
      color: requireStr(params.color, "color"),
      description: str(params.description),
      icon: str(params.icon),
      isPublic: bool(params.isPublic),
      name: requireStr(params.name, "name"),
      organizationId,
    })
);

defineTool(
  "tag_update",
  "Update an existing tag's properties.",
  {
    properties: {
      color: { description: "New tag color", type: "string" },
      description: { description: "New description", type: "string" },
      icon: { description: "New emoji icon", type: "string" },
      isPublic: {
        description: "Whether the tag is visible in the public widget",
        type: "boolean",
      },
      name: { description: "New tag name", type: "string" },
      tagId: { description: "The tag ID", type: "string" },
    },
    required: ["tagId"],
    type: "object",
  },
  async (ctx, organizationId, params) =>
    ctx.runMutation(internal.admin_api.tags.updateTag, {
      color: str(params.color),
      description: str(params.description),
      icon: str(params.icon),
      isPublic: bool(params.isPublic),
      name: str(params.name),
      organizationId,
      tagId: asId<"tags">(params.tagId, "tagId"),
    })
);

defineTool(
  "tag_delete",
  "Delete a tag. This will remove the tag from all feedback items.",
  {
    properties: {
      tagId: { description: "The tag ID to delete", type: "string" },
    },
    required: ["tagId"],
    type: "object",
  },
  async (ctx, organizationId, params) =>
    ctx.runMutation(internal.admin_api.tags.deleteTag, {
      organizationId,
      tagId: asId<"tags">(params.tagId, "tagId"),
    })
);

export const tagTools = tools;
