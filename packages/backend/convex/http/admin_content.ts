import type { httpRouter } from "convex/server";
import { internal } from "../_generated/api";
import {
  adminGet,
  adminPost,
  bool,
  corsOptionsHandler,
  num,
  parseId,
  requireStr,
  str,
} from "./helpers";

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
  "/api/v1/admin/release/schedule",
  "/api/v1/admin/release/cancel-schedule",
  "/api/v1/admin/statuses",
  "/api/v1/admin/status/create",
  "/api/v1/admin/status/update",
  "/api/v1/admin/status/delete",
  "/api/v1/admin/duplicates",
  "/api/v1/admin/duplicate/resolve",
  "/api/v1/admin/duplicate/merge",
  "/api/v1/admin/screenshots",
  "/api/v1/admin/screenshot/delete",
] as const;

export function registerAdminContentRoutes(http: Router): void {
  http.route({
    handler: adminGet(async (ctx, { organizationId }) =>
      ctx.runQuery(internal.admin_api.tags.listTags, { organizationId })
    ),
    method: "GET",
    path: "/api/v1/admin/tags",
  });

  http.route({
    handler: adminPost(async (ctx, { organizationId }, body) =>
      ctx.runMutation(internal.admin_api.tags.createTag, {
        color: requireStr(body.color, "color"),
        description: str(body.description),
        icon: str(body.icon),
        isPublic: bool(body.isPublic),
        name: requireStr(body.name, "name"),
        organizationId,
      })
    ),
    method: "POST",
    path: "/api/v1/admin/tag/create",
  });

  http.route({
    handler: adminPost(async (ctx, { organizationId }, body) =>
      ctx.runMutation(internal.admin_api.tags.updateTag, {
        color: str(body.color),
        description: str(body.description),
        icon: str(body.icon),
        isPublic: bool(body.isPublic),
        name: str(body.name),
        organizationId,
        tagId: parseId<"tags">(str(body.tagId), "tagId"),
      })
    ),
    method: "POST",
    path: "/api/v1/admin/tag/update",
  });

  http.route({
    handler: adminPost(async (ctx, { organizationId }, body) =>
      ctx.runMutation(internal.admin_api.tags.deleteTag, {
        organizationId,
        tagId: parseId<"tags">(str(body.tagId), "tagId"),
      })
    ),
    method: "POST",
    path: "/api/v1/admin/tag/delete",
  });
  http.route({
    handler: adminGet(async (ctx, { organizationId }, url) => {
      const statusParam = url.searchParams.get("status");
      const limitParam = url.searchParams.get("limit");
      const offsetParam = url.searchParams.get("offset");
      return await ctx.runQuery(internal.admin_api.releases.listReleases, {
        limit: limitParam ? Number.parseInt(limitParam, 10) : undefined,
        offset: offsetParam ? Number.parseInt(offsetParam, 10) : undefined,
        organizationId,
        status: (statusParam ?? undefined) as
          | "all"
          | "draft"
          | "published"
          | undefined,
      });
    }),
    method: "GET",
    path: "/api/v1/admin/releases",
  });

  http.route({
    handler: adminGet(async (ctx, { organizationId }, url) => {
      const id = url.searchParams.get("id");
      return await ctx.runQuery(internal.admin_api.releases.getRelease, {
        organizationId,
        releaseId: parseId<"releases">(id, "id"),
      });
    }),
    method: "GET",
    path: "/api/v1/admin/release",
  });

  http.route({
    handler: adminPost(async (ctx, { organizationId }, body) =>
      ctx.runMutation(internal.admin_api.releases.createRelease, {
        description: str(body.description),
        organizationId,
        title: requireStr(body.title, "title"),
        version: str(body.version),
      })
    ),
    method: "POST",
    path: "/api/v1/admin/release/create",
  });

  http.route({
    handler: adminPost(async (ctx, { organizationId }, body) =>
      ctx.runMutation(internal.admin_api.releases.updateRelease, {
        description: str(body.description),
        organizationId,
        releaseId: parseId<"releases">(str(body.releaseId), "releaseId"),
        title: str(body.title),
        version: str(body.version),
      })
    ),
    method: "POST",
    path: "/api/v1/admin/release/update",
  });

  http.route({
    handler: adminPost(async (ctx, { organizationId }, body) =>
      ctx.runMutation(internal.admin_api.releases.publishRelease, {
        organizationId,
        releaseId: parseId<"releases">(str(body.releaseId), "releaseId"),
      })
    ),
    method: "POST",
    path: "/api/v1/admin/release/publish",
  });

  http.route({
    handler: adminPost(async (ctx, { organizationId }, body) =>
      ctx.runMutation(internal.admin_api.releases.unpublishRelease, {
        organizationId,
        releaseId: parseId<"releases">(str(body.releaseId), "releaseId"),
      })
    ),
    method: "POST",
    path: "/api/v1/admin/release/unpublish",
  });

  http.route({
    handler: adminPost(async (ctx, { organizationId }, body) =>
      ctx.runMutation(internal.admin_api.releases.deleteRelease, {
        organizationId,
        releaseId: parseId<"releases">(str(body.releaseId), "releaseId"),
      })
    ),
    method: "POST",
    path: "/api/v1/admin/release/delete",
  });

  http.route({
    handler: adminPost(async (ctx, { organizationId }, body) =>
      ctx.runMutation(internal.admin_api.releases.linkReleaseFeedback, {
        action: requireStr(body.action, "action") as "link" | "unlink",
        feedbackId: parseId<"feedback">(str(body.feedbackId), "feedbackId"),
        organizationId,
        releaseId: parseId<"releases">(str(body.releaseId), "releaseId"),
      })
    ),
    method: "POST",
    path: "/api/v1/admin/release/link-feedback",
  });

  http.route({
    handler: adminPost(async (ctx, { organizationId }, body) =>
      ctx.runMutation(internal.admin_api.releases.scheduleRelease, {
        feedbackStatus: str(body.feedbackStatus) as
          | "open"
          | "under_review"
          | "planned"
          | "in_progress"
          | "completed"
          | "closed"
          | undefined,
        organizationId,
        releaseId: parseId<"releases">(str(body.releaseId), "releaseId"),
        scheduledPublishAt: num(body.scheduledPublishAt) ?? 0,
      })
    ),
    method: "POST",
    path: "/api/v1/admin/release/schedule",
  });

  http.route({
    handler: adminPost(async (ctx, { organizationId }, body) =>
      ctx.runMutation(internal.admin_api.releases.cancelScheduledRelease, {
        organizationId,
        releaseId: parseId<"releases">(str(body.releaseId), "releaseId"),
      })
    ),
    method: "POST",
    path: "/api/v1/admin/release/cancel-schedule",
  });
  http.route({
    handler: adminGet(async (ctx, { organizationId }) =>
      ctx.runQuery(internal.admin_api.statuses.listStatuses, {
        organizationId,
      })
    ),
    method: "GET",
    path: "/api/v1/admin/statuses",
  });

  http.route({
    handler: adminPost(async (ctx, { organizationId }, body) =>
      ctx.runMutation(internal.admin_api.statuses.createStatus, {
        color: requireStr(body.color, "color"),
        icon: str(body.icon),
        name: requireStr(body.name, "name"),
        organizationId,
      })
    ),
    method: "POST",
    path: "/api/v1/admin/status/create",
  });

  http.route({
    handler: adminPost(async (ctx, { organizationId }, body) =>
      ctx.runMutation(internal.admin_api.statuses.updateStatus, {
        color: str(body.color),
        icon: str(body.icon),
        name: str(body.name),
        organizationId,
        statusId: parseId<"organizationStatuses">(
          str(body.statusId),
          "statusId"
        ),
      })
    ),
    method: "POST",
    path: "/api/v1/admin/status/update",
  });

  http.route({
    handler: adminPost(async (ctx, { organizationId }, body) =>
      ctx.runMutation(internal.admin_api.statuses.deleteStatus, {
        organizationId,
        statusId: parseId<"organizationStatuses">(
          str(body.statusId),
          "statusId"
        ),
      })
    ),
    method: "POST",
    path: "/api/v1/admin/status/delete",
  });
  http.route({
    handler: adminGet(async (ctx, { organizationId }) =>
      ctx.runQuery(internal.admin_api.duplicates.listPendingDuplicates, {
        organizationId,
      })
    ),
    method: "GET",
    path: "/api/v1/admin/duplicates",
  });

  http.route({
    handler: adminPost(async (ctx, _auth, body) =>
      ctx.runMutation(internal.admin_api.duplicates.resolveDuplicate, {
        action: requireStr(body.action, "action") as "confirm" | "reject",
        pairId: parseId<"duplicatePairs">(str(body.pairId), "pairId"),
        resolvedBy: "api-admin",
      })
    ),
    method: "POST",
    path: "/api/v1/admin/duplicate/resolve",
  });

  http.route({
    handler: adminPost(async (ctx, _auth, body) =>
      ctx.runMutation(internal.admin_api.duplicates.mergeFeedback, {
        mergedBy: "api-admin",
        pairId: body.pairId
          ? parseId<"duplicatePairs">(str(body.pairId), "pairId")
          : undefined,
        sourceFeedbackId: parseId<"feedback">(
          str(body.sourceFeedbackId),
          "sourceFeedbackId"
        ),
        targetFeedbackId: parseId<"feedback">(
          str(body.targetFeedbackId),
          "targetFeedbackId"
        ),
      })
    ),
    method: "POST",
    path: "/api/v1/admin/duplicate/merge",
  });
  http.route({
    handler: adminGet((ctx, { organizationId }, url) => {
      const feedbackId = parseId<"feedback">(
        requireStr(url.searchParams.get("feedbackId"), "feedbackId"),
        "feedbackId"
      );
      return ctx.runQuery(internal.admin_api.screenshots.listScreenshots, {
        feedbackId,
        organizationId,
      });
    }),
    method: "GET",
    path: "/api/v1/admin/screenshots",
  });

  http.route({
    handler: adminPost(async (ctx, { organizationId }, body) =>
      ctx.runMutation(internal.admin_api.screenshots.deleteScreenshot, {
        organizationId,
        screenshotId: parseId<"feedbackScreenshots">(
          requireStr(body.screenshotId, "screenshotId"),
          "screenshotId"
        ),
      })
    ),
    method: "POST",
    path: "/api/v1/admin/screenshot/delete",
  });
  for (const path of ADMIN_CONTENT_PATHS) {
    http.route({ handler: corsOptionsHandler(), method: "OPTIONS", path });
  }
}
