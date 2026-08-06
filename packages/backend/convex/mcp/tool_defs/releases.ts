import { internal } from "../../_generated/api";
import { num, requireStr, str } from "../../http/helpers";
import { asId, createToolRegistry } from "../tool_registry";

const { defineTool, tools } = createToolRegistry();

defineTool(
  "release_list",
  "List releases (changelog entries). Filter by draft/published status.",
  {
    properties: {
      limit: { description: "Max items to return", type: "number" },
      offset: { description: "Pagination offset", type: "number" },
      status: {
        description: "Filter by publish status (default: all)",
        enum: ["draft", "published", "all"],
        type: "string",
      },
    },
    type: "object",
  },
  async (ctx, organizationId, params) =>
    ctx.runQuery(internal.admin_api.releases.listReleases, {
      limit: num(params.limit),
      offset: num(params.offset),
      organizationId,
      status: str(params.status) as "draft" | "published" | "all" | undefined,
    })
);

defineTool(
  "release_get",
  "Get a single release with its linked feedback items.",
  {
    properties: {
      releaseId: { description: "The release ID", type: "string" },
    },
    required: ["releaseId"],
    type: "object",
  },
  async (ctx, organizationId, params) =>
    ctx.runQuery(internal.admin_api.releases.getRelease, {
      organizationId,
      releaseId: asId<"releases">(params.releaseId, "releaseId"),
    })
);

defineTool(
  "release_create",
  "Create a new draft release (changelog entry).",
  {
    properties: {
      description: {
        description: "Release description/notes (rich text or markdown)",
        type: "string",
      },
      title: { description: "Release title", type: "string" },
      version: {
        description: "Version string (e.g., 'v1.2.0')",
        type: "string",
      },
    },
    required: ["title"],
    type: "object",
  },
  async (ctx, organizationId, params) =>
    ctx.runMutation(internal.admin_api.releases.createRelease, {
      description: str(params.description),
      organizationId,
      title: requireStr(params.title, "title"),
      version: str(params.version),
    })
);

defineTool(
  "release_update",
  "Update a release's title, description, or version.",
  {
    properties: {
      description: {
        description: "New description/notes",
        type: "string",
      },
      releaseId: { description: "The release ID", type: "string" },
      title: { description: "New title", type: "string" },
      version: { description: "New version string", type: "string" },
    },
    required: ["releaseId"],
    type: "object",
  },
  async (ctx, organizationId, params) =>
    ctx.runMutation(internal.admin_api.releases.updateRelease, {
      description: str(params.description),
      organizationId,
      releaseId: asId<"releases">(params.releaseId, "releaseId"),
      title: str(params.title),
      version: str(params.version),
    })
);

defineTool(
  "release_publish",
  "Publish a draft release, making it visible in the public changelog.",
  {
    properties: {
      releaseId: {
        description: "The release ID to publish",
        type: "string",
      },
    },
    required: ["releaseId"],
    type: "object",
  },
  async (ctx, organizationId, params) =>
    ctx.runMutation(internal.admin_api.releases.publishRelease, {
      organizationId,
      releaseId: asId<"releases">(params.releaseId, "releaseId"),
    })
);

defineTool(
  "release_unpublish",
  "Unpublish a release, returning it to draft status.",
  {
    properties: {
      releaseId: {
        description: "The release ID to unpublish",
        type: "string",
      },
    },
    required: ["releaseId"],
    type: "object",
  },
  async (ctx, organizationId, params) =>
    ctx.runMutation(internal.admin_api.releases.unpublishRelease, {
      organizationId,
      releaseId: asId<"releases">(params.releaseId, "releaseId"),
    })
);

defineTool(
  "release_delete",
  "Delete a release entirely.",
  {
    properties: {
      releaseId: {
        description: "The release ID to delete",
        type: "string",
      },
    },
    required: ["releaseId"],
    type: "object",
  },
  async (ctx, organizationId, params) =>
    ctx.runMutation(internal.admin_api.releases.deleteRelease, {
      organizationId,
      releaseId: asId<"releases">(params.releaseId, "releaseId"),
    })
);

defineTool(
  "release_link_feedback",
  "Link or unlink a feedback item to/from a release.",
  {
    properties: {
      action: {
        description: "Whether to link or unlink",
        enum: ["link", "unlink"],
        type: "string",
      },
      feedbackId: { description: "The feedback item ID", type: "string" },
      releaseId: { description: "The release ID", type: "string" },
    },
    required: ["releaseId", "feedbackId", "action"],
    type: "object",
  },
  async (ctx, organizationId, params) =>
    ctx.runMutation(internal.admin_api.releases.linkReleaseFeedback, {
      action: requireStr(params.action, "action") as "link" | "unlink",
      feedbackId: asId<"feedback">(params.feedbackId, "feedbackId"),
      organizationId,
      releaseId: asId<"releases">(params.releaseId, "releaseId"),
    })
);

export const releaseTools = tools;
