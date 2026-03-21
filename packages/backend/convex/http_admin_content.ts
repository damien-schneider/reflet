import type { httpRouter } from "convex/server";
import { internal } from "./_generated/api";
import {
  adminGet,
  adminPost,
  bool,
  corsOptionsHandler,
  parseId,
  requireStr,
  str,
} from "./http_admin_helpers";

type Router = ReturnType<typeof httpRouter>;

const ADMIN_CONTENT_PATHS = [
  "/api/v1/admin/tags",
  "/api/v1/admin/tag/create",
  "/api/v1/admin/tag/update",
  "/api/v1/admin/tag/delete",
  "/api/v1/admin/releases",
  "/api/v1/admin/release",
  "/api/v1/admin/release/create",
  "/api/v1/admin/release/update",
  "/api/v1/admin/release/publish",
  "/api/v1/admin/release/unpublish",
  "/api/v1/admin/release/delete",
  "/api/v1/admin/release/link-feedback",
  "/api/v1/admin/statuses",
  "/api/v1/admin/status/create",
  "/api/v1/admin/status/update",
  "/api/v1/admin/status/delete",
] as const;

export function registerAdminContentRoutes(http: Router): void {
  // ============================================
  // TAGS
  // ============================================

  http.route({
    path: "/api/v1/admin/tags",
    method: "GET",
    handler: adminGet(async (ctx, { organizationId }) =>
      ctx.runQuery(internal.admin_api_tags.listTags, { organizationId })
    ),
  });

  http.route({
    path: "/api/v1/admin/tag/create",
    method: "POST",
    handler: adminPost(async (ctx, { organizationId }, body) =>
      ctx.runMutation(internal.admin_api_tags.createTag, {
        organizationId,
        name: requireStr(body.name, "name"),
        color: requireStr(body.color, "color"),
        icon: str(body.icon),
        description: str(body.description),
        isPublic: bool(body.isPublic),
      })
    ),
  });

  http.route({
    path: "/api/v1/admin/tag/update",
    method: "POST",
    handler: adminPost(async (ctx, { organizationId }, body) =>
      ctx.runMutation(internal.admin_api_tags.updateTag, {
        organizationId,
        tagId: parseId<"tags">(str(body.tagId), "tagId"),
        name: str(body.name),
        color: str(body.color),
        icon: str(body.icon),
        description: str(body.description),
        isPublic: bool(body.isPublic),
      })
    ),
  });

  http.route({
    path: "/api/v1/admin/tag/delete",
    method: "POST",
    handler: adminPost(async (ctx, { organizationId }, body) =>
      ctx.runMutation(internal.admin_api_tags.deleteTag, {
        organizationId,
        tagId: parseId<"tags">(str(body.tagId), "tagId"),
      })
    ),
  });

  // ============================================
  // RELEASES
  // ============================================

  http.route({
    path: "/api/v1/admin/releases",
    method: "GET",
    handler: adminGet(async (ctx, { organizationId }, url) => {
      const statusParam = url.searchParams.get("status");
      const limitParam = url.searchParams.get("limit");
      const offsetParam = url.searchParams.get("offset");
      return await ctx.runQuery(internal.admin_api_releases.listReleases, {
        organizationId,
        status: (statusParam ?? undefined) as
          | "all"
          | "draft"
          | "published"
          | undefined,
        limit: limitParam ? Number.parseInt(limitParam, 10) : undefined,
        offset: offsetParam ? Number.parseInt(offsetParam, 10) : undefined,
      });
    }),
  });

  http.route({
    path: "/api/v1/admin/release",
    method: "GET",
    handler: adminGet(async (ctx, { organizationId }, url) => {
      const id = url.searchParams.get("id");
      return await ctx.runQuery(internal.admin_api_releases.getRelease, {
        organizationId,
        releaseId: parseId<"releases">(id, "id"),
      });
    }),
  });

  http.route({
    path: "/api/v1/admin/release/create",
    method: "POST",
    handler: adminPost(async (ctx, { organizationId }, body) =>
      ctx.runMutation(internal.admin_api_releases.createRelease, {
        organizationId,
        title: requireStr(body.title, "title"),
        description: str(body.description),
        version: str(body.version),
      })
    ),
  });

  http.route({
    path: "/api/v1/admin/release/update",
    method: "POST",
    handler: adminPost(async (ctx, { organizationId }, body) =>
      ctx.runMutation(internal.admin_api_releases.updateRelease, {
        organizationId,
        releaseId: parseId<"releases">(str(body.releaseId), "releaseId"),
        title: str(body.title),
        description: str(body.description),
        version: str(body.version),
      })
    ),
  });

  http.route({
    path: "/api/v1/admin/release/publish",
    method: "POST",
    handler: adminPost(async (ctx, { organizationId }, body) =>
      ctx.runMutation(internal.admin_api_releases.publishRelease, {
        organizationId,
        releaseId: parseId<"releases">(str(body.releaseId), "releaseId"),
      })
    ),
  });

  http.route({
    path: "/api/v1/admin/release/unpublish",
    method: "POST",
    handler: adminPost(async (ctx, { organizationId }, body) =>
      ctx.runMutation(internal.admin_api_releases.unpublishRelease, {
        organizationId,
        releaseId: parseId<"releases">(str(body.releaseId), "releaseId"),
      })
    ),
  });

  http.route({
    path: "/api/v1/admin/release/delete",
    method: "POST",
    handler: adminPost(async (ctx, { organizationId }, body) =>
      ctx.runMutation(internal.admin_api_releases.deleteRelease, {
        organizationId,
        releaseId: parseId<"releases">(str(body.releaseId), "releaseId"),
      })
    ),
  });

  http.route({
    path: "/api/v1/admin/release/link-feedback",
    method: "POST",
    handler: adminPost(async (ctx, { organizationId }, body) =>
      ctx.runMutation(internal.admin_api_releases.linkReleaseFeedback, {
        organizationId,
        releaseId: parseId<"releases">(str(body.releaseId), "releaseId"),
        feedbackId: parseId<"feedback">(str(body.feedbackId), "feedbackId"),
        action: requireStr(body.action, "action") as "link" | "unlink",
      })
    ),
  });

  // ============================================
  // STATUSES
  // ============================================

  http.route({
    path: "/api/v1/admin/statuses",
    method: "GET",
    handler: adminGet(async (ctx, { organizationId }) =>
      ctx.runQuery(internal.admin_api_statuses.listStatuses, {
        organizationId,
      })
    ),
  });

  http.route({
    path: "/api/v1/admin/status/create",
    method: "POST",
    handler: adminPost(async (ctx, { organizationId }, body) =>
      ctx.runMutation(internal.admin_api_statuses.createStatus, {
        organizationId,
        name: requireStr(body.name, "name"),
        color: requireStr(body.color, "color"),
        icon: str(body.icon),
      })
    ),
  });

  http.route({
    path: "/api/v1/admin/status/update",
    method: "POST",
    handler: adminPost(async (ctx, { organizationId }, body) =>
      ctx.runMutation(internal.admin_api_statuses.updateStatus, {
        organizationId,
        statusId: parseId<"organizationStatuses">(
          str(body.statusId),
          "statusId"
        ),
        name: str(body.name),
        color: str(body.color),
        icon: str(body.icon),
      })
    ),
  });

  http.route({
    path: "/api/v1/admin/status/delete",
    method: "POST",
    handler: adminPost(async (ctx, { organizationId }, body) =>
      ctx.runMutation(internal.admin_api_statuses.deleteStatus, {
        organizationId,
        statusId: parseId<"organizationStatuses">(
          str(body.statusId),
          "statusId"
        ),
      })
    ),
  });

  // --- CORS preflight for all admin content routes ---
  for (const path of ADMIN_CONTENT_PATHS) {
    http.route({ path, method: "OPTIONS", handler: corsOptionsHandler() });
  }
}
