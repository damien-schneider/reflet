import { internal } from "../_generated/api";
import { num, requireStr, str } from "../http/helpers";
import type { ToolRegistration } from "./tools_shared";
import { asId, defineTool } from "./tools_shared";

export const releaseTools: ToolRegistration[] = [
  defineTool(
    "release_list",
    "List releases (changelog entries). Filter by draft/published status.",
    {
      type: "object",
      properties: {
        status: {
          type: "string",
          enum: ["draft", "published", "all"],
          description: "Filter by publish status (default: all)",
        },
        limit: { type: "number", description: "Max items to return" },
        offset: { type: "number", description: "Pagination offset" },
      },
    },
    async (ctx, organizationId, params) =>
      ctx.runQuery(internal.admin_api.releases.listReleases, {
        organizationId,
        status: str(params.status) as "draft" | "published" | "all" | undefined,
        limit: num(params.limit),
        offset: num(params.offset),
      })
  ),

  defineTool(
    "release_get",
    "Get a single release with its linked feedback items.",
    {
      type: "object",
      properties: {
        releaseId: { type: "string", description: "The release ID" },
      },
      required: ["releaseId"],
    },
    async (ctx, organizationId, params) =>
      ctx.runQuery(internal.admin_api.releases.getRelease, {
        organizationId,
        releaseId: asId<"releases">(params.releaseId, "releaseId"),
      })
  ),

  defineTool(
    "release_create",
    "Create a new draft release (changelog entry).",
    {
      type: "object",
      properties: {
        title: { type: "string", description: "Release title" },
        description: {
          type: "string",
          description: "Release description/notes (rich text or markdown)",
        },
        version: {
          type: "string",
          description: "Version string (e.g., 'v1.2.0')",
        },
      },
      required: ["title"],
    },
    async (ctx, organizationId, params) =>
      ctx.runMutation(internal.admin_api.releases.createRelease, {
        organizationId,
        title: requireStr(params.title, "title"),
        description: str(params.description),
        version: str(params.version),
      })
  ),

  defineTool(
    "release_update",
    "Update a release's title, description, or version.",
    {
      type: "object",
      properties: {
        releaseId: { type: "string", description: "The release ID" },
        title: { type: "string", description: "New title" },
        description: {
          type: "string",
          description: "New description/notes",
        },
        version: { type: "string", description: "New version string" },
      },
      required: ["releaseId"],
    },
    async (ctx, organizationId, params) =>
      ctx.runMutation(internal.admin_api.releases.updateRelease, {
        organizationId,
        releaseId: asId<"releases">(params.releaseId, "releaseId"),
        title: str(params.title),
        description: str(params.description),
        version: str(params.version),
      })
  ),

  defineTool(
    "release_publish",
    "Publish a draft release, making it visible in the public changelog.",
    {
      type: "object",
      properties: {
        releaseId: {
          type: "string",
          description: "The release ID to publish",
        },
      },
      required: ["releaseId"],
    },
    async (ctx, organizationId, params) =>
      ctx.runMutation(internal.admin_api.releases.publishRelease, {
        organizationId,
        releaseId: asId<"releases">(params.releaseId, "releaseId"),
      })
  ),

  defineTool(
    "release_unpublish",
    "Unpublish a release, returning it to draft status.",
    {
      type: "object",
      properties: {
        releaseId: {
          type: "string",
          description: "The release ID to unpublish",
        },
      },
      required: ["releaseId"],
    },
    async (ctx, organizationId, params) =>
      ctx.runMutation(internal.admin_api.releases.unpublishRelease, {
        organizationId,
        releaseId: asId<"releases">(params.releaseId, "releaseId"),
      })
  ),

  defineTool(
    "release_delete",
    "Delete a release entirely.",
    {
      type: "object",
      properties: {
        releaseId: {
          type: "string",
          description: "The release ID to delete",
        },
      },
      required: ["releaseId"],
    },
    async (ctx, organizationId, params) =>
      ctx.runMutation(internal.admin_api.releases.deleteRelease, {
        organizationId,
        releaseId: asId<"releases">(params.releaseId, "releaseId"),
      })
  ),

  defineTool(
    "release_link_feedback",
    "Link or unlink a feedback item to/from a release.",
    {
      type: "object",
      properties: {
        releaseId: { type: "string", description: "The release ID" },
        feedbackId: { type: "string", description: "The feedback item ID" },
        action: {
          type: "string",
          enum: ["link", "unlink"],
          description: "Whether to link or unlink",
        },
      },
      required: ["releaseId", "feedbackId", "action"],
    },
    async (ctx, organizationId, params) =>
      ctx.runMutation(internal.admin_api.releases.linkReleaseFeedback, {
        organizationId,
        releaseId: asId<"releases">(params.releaseId, "releaseId"),
        feedbackId: asId<"feedback">(params.feedbackId, "feedbackId"),
        action: requireStr(params.action, "action") as "link" | "unlink",
      })
  ),
];
