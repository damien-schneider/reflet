import { internal } from "../_generated/api";
import { bool, requireStr, str } from "../http/helpers";
import type { ToolRegistration } from "./tools_shared";
import { asId, defineTool } from "./tools_shared";

export const tagTools: ToolRegistration[] = [
  defineTool(
    "tag_list",
    "List all tags in the organization. Tags are used to categorize feedback items.",
    { type: "object", properties: {} },
    async (ctx, organizationId) =>
      ctx.runQuery(internal.admin_api.tags.listTags, { organizationId })
  ),

  defineTool(
    "tag_create",
    "Create a new tag for categorizing feedback.",
    {
      type: "object",
      properties: {
        name: { type: "string", description: "Tag name" },
        color: {
          type: "string",
          description: "Tag color (e.g., 'blue', 'red', 'green')",
        },
        icon: { type: "string", description: "Emoji icon (e.g., fire, box)" },
        description: { type: "string", description: "Tag description" },
        isPublic: {
          type: "boolean",
          description: "Whether the tag is visible in the public widget",
        },
      },
      required: ["name", "color"],
    },
    async (ctx, organizationId, params) =>
      ctx.runMutation(internal.admin_api.tags.createTag, {
        organizationId,
        name: requireStr(params.name, "name"),
        color: requireStr(params.color, "color"),
        icon: str(params.icon),
        description: str(params.description),
        isPublic: bool(params.isPublic),
      })
  ),

  defineTool(
    "tag_update",
    "Update an existing tag's properties.",
    {
      type: "object",
      properties: {
        tagId: { type: "string", description: "The tag ID" },
        name: { type: "string", description: "New tag name" },
        color: { type: "string", description: "New tag color" },
        icon: { type: "string", description: "New emoji icon" },
        description: { type: "string", description: "New description" },
        isPublic: {
          type: "boolean",
          description: "Whether the tag is visible in the public widget",
        },
      },
      required: ["tagId"],
    },
    async (ctx, organizationId, params) =>
      ctx.runMutation(internal.admin_api.tags.updateTag, {
        organizationId,
        tagId: asId<"tags">(params.tagId, "tagId"),
        name: str(params.name),
        color: str(params.color),
        icon: str(params.icon),
        description: str(params.description),
        isPublic: bool(params.isPublic),
      })
  ),

  defineTool(
    "tag_delete",
    "Delete a tag. This will remove the tag from all feedback items.",
    {
      type: "object",
      properties: {
        tagId: { type: "string", description: "The tag ID to delete" },
      },
      required: ["tagId"],
    },
    async (ctx, organizationId, params) =>
      ctx.runMutation(internal.admin_api.tags.deleteTag, {
        organizationId,
        tagId: asId<"tags">(params.tagId, "tagId"),
      })
  ),
];
