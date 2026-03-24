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
  "/api/v1/admin/surveys",
  "/api/v1/admin/survey",
  "/api/v1/admin/survey/create",
  "/api/v1/admin/survey/update-status",
  "/api/v1/admin/survey/delete",
  "/api/v1/admin/survey/analytics",
  "/api/v1/admin/survey/duplicate",
  "/api/v1/admin/survey/update",
  "/api/v1/admin/survey/responses",
] as const;

export function registerAdminContentRoutes(http: Router): void {
  // ============================================
  // TAGS
  // ============================================

  http.route({
    path: "/api/v1/admin/tags",
    method: "GET",
    handler: adminGet(async (ctx, { organizationId }) =>
      ctx.runQuery(internal.admin_api.tags.listTags, { organizationId })
    ),
  });

  http.route({
    path: "/api/v1/admin/tag/create",
    method: "POST",
    handler: adminPost(async (ctx, { organizationId }, body) =>
      ctx.runMutation(internal.admin_api.tags.createTag, {
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
      ctx.runMutation(internal.admin_api.tags.updateTag, {
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
      ctx.runMutation(internal.admin_api.tags.deleteTag, {
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
      return await ctx.runQuery(internal.admin_api.releases.listReleases, {
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
      return await ctx.runQuery(internal.admin_api.releases.getRelease, {
        organizationId,
        releaseId: parseId<"releases">(id, "id"),
      });
    }),
  });

  http.route({
    path: "/api/v1/admin/release/create",
    method: "POST",
    handler: adminPost(async (ctx, { organizationId }, body) =>
      ctx.runMutation(internal.admin_api.releases.createRelease, {
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
      ctx.runMutation(internal.admin_api.releases.updateRelease, {
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
      ctx.runMutation(internal.admin_api.releases.publishRelease, {
        organizationId,
        releaseId: parseId<"releases">(str(body.releaseId), "releaseId"),
      })
    ),
  });

  http.route({
    path: "/api/v1/admin/release/unpublish",
    method: "POST",
    handler: adminPost(async (ctx, { organizationId }, body) =>
      ctx.runMutation(internal.admin_api.releases.unpublishRelease, {
        organizationId,
        releaseId: parseId<"releases">(str(body.releaseId), "releaseId"),
      })
    ),
  });

  http.route({
    path: "/api/v1/admin/release/delete",
    method: "POST",
    handler: adminPost(async (ctx, { organizationId }, body) =>
      ctx.runMutation(internal.admin_api.releases.deleteRelease, {
        organizationId,
        releaseId: parseId<"releases">(str(body.releaseId), "releaseId"),
      })
    ),
  });

  http.route({
    path: "/api/v1/admin/release/link-feedback",
    method: "POST",
    handler: adminPost(async (ctx, { organizationId }, body) =>
      ctx.runMutation(internal.admin_api.releases.linkReleaseFeedback, {
        organizationId,
        releaseId: parseId<"releases">(str(body.releaseId), "releaseId"),
        feedbackId: parseId<"feedback">(str(body.feedbackId), "feedbackId"),
        action: requireStr(body.action, "action") as "link" | "unlink",
      })
    ),
  });

  http.route({
    path: "/api/v1/admin/release/schedule",
    method: "POST",
    handler: adminPost(async (ctx, { organizationId }, body) =>
      ctx.runMutation(internal.admin_api.releases.scheduleRelease, {
        organizationId,
        releaseId: parseId<"releases">(str(body.releaseId), "releaseId"),
        scheduledPublishAt: num(body.scheduledPublishAt) ?? 0,
        feedbackStatus: str(body.feedbackStatus) as
          | "open"
          | "under_review"
          | "planned"
          | "in_progress"
          | "completed"
          | "closed"
          | undefined,
      })
    ),
  });

  http.route({
    path: "/api/v1/admin/release/cancel-schedule",
    method: "POST",
    handler: adminPost(async (ctx, { organizationId }, body) =>
      ctx.runMutation(internal.admin_api.releases.cancelScheduledRelease, {
        organizationId,
        releaseId: parseId<"releases">(str(body.releaseId), "releaseId"),
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
      ctx.runQuery(internal.admin_api.statuses.listStatuses, {
        organizationId,
      })
    ),
  });

  http.route({
    path: "/api/v1/admin/status/create",
    method: "POST",
    handler: adminPost(async (ctx, { organizationId }, body) =>
      ctx.runMutation(internal.admin_api.statuses.createStatus, {
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
      ctx.runMutation(internal.admin_api.statuses.updateStatus, {
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
      ctx.runMutation(internal.admin_api.statuses.deleteStatus, {
        organizationId,
        statusId: parseId<"organizationStatuses">(
          str(body.statusId),
          "statusId"
        ),
      })
    ),
  });

  // ============================================
  // DUPLICATES
  // ============================================

  http.route({
    path: "/api/v1/admin/duplicates",
    method: "GET",
    handler: adminGet(async (ctx, { organizationId }) =>
      ctx.runQuery(internal.admin_api.duplicates.listPendingDuplicates, {
        organizationId,
      })
    ),
  });

  http.route({
    path: "/api/v1/admin/duplicate/resolve",
    method: "POST",
    handler: adminPost(async (ctx, _auth, body) =>
      ctx.runMutation(internal.admin_api.duplicates.resolveDuplicate, {
        pairId: parseId<"duplicatePairs">(str(body.pairId), "pairId"),
        action: requireStr(body.action, "action") as "confirm" | "reject",
        resolvedBy: "api-admin",
      })
    ),
  });

  http.route({
    path: "/api/v1/admin/duplicate/merge",
    method: "POST",
    handler: adminPost(async (ctx, _auth, body) =>
      ctx.runMutation(internal.admin_api.duplicates.mergeFeedback, {
        sourceFeedbackId: parseId<"feedback">(
          str(body.sourceFeedbackId),
          "sourceFeedbackId"
        ),
        targetFeedbackId: parseId<"feedback">(
          str(body.targetFeedbackId),
          "targetFeedbackId"
        ),
        pairId: body.pairId
          ? parseId<"duplicatePairs">(str(body.pairId), "pairId")
          : undefined,
        mergedBy: "api-admin",
      })
    ),
  });

  // ============================================
  // SCREENSHOTS
  // ============================================

  http.route({
    path: "/api/v1/admin/screenshots",
    method: "GET",
    handler: adminGet((ctx, _auth, url) => {
      const feedbackId = parseId<"feedback">(
        requireStr(url.searchParams.get("feedbackId"), "feedbackId"),
        "feedbackId"
      );
      return ctx.runQuery(internal.admin_api.screenshots.listScreenshots, {
        feedbackId,
      });
    }),
  });

  http.route({
    path: "/api/v1/admin/screenshot/delete",
    method: "POST",
    handler: adminPost(async (ctx, _auth, body) =>
      ctx.runMutation(internal.admin_api.screenshots.deleteScreenshot, {
        screenshotId: parseId<"feedbackScreenshots">(
          requireStr(body.screenshotId, "screenshotId"),
          "screenshotId"
        ),
      })
    ),
  });

  // ============================================
  // SURVEYS
  // ============================================

  http.route({
    path: "/api/v1/admin/surveys",
    method: "GET",
    handler: adminGet((ctx, { organizationId }, url) => {
      const statusParam = url.searchParams.get("status");
      return ctx.runQuery(internal.admin_api.survey.listSurveys, {
        organizationId,
        status: (statusParam ?? undefined) as
          | "draft"
          | "active"
          | "paused"
          | "closed"
          | undefined,
      });
    }),
  });

  http.route({
    path: "/api/v1/admin/survey",
    method: "GET",
    handler: adminGet((ctx, _auth, url) =>
      ctx.runQuery(internal.admin_api.survey.getSurvey, {
        surveyId: parseId<"surveys">(url.searchParams.get("id"), "id"),
      })
    ),
  });

  http.route({
    path: "/api/v1/admin/survey/create",
    method: "POST",
    handler: adminPost((ctx, { organizationId }, body) => {
      const questions = Array.isArray(body.questions) ? body.questions : [];
      return ctx.runMutation(internal.admin_api.survey.createSurvey, {
        organizationId,
        title: requireStr(body.title, "title"),
        description: str(body.description),
        triggerType: requireStr(body.triggerType, "triggerType") as
          | "manual"
          | "page_visit"
          | "time_delay"
          | "exit_intent"
          | "feedback_submitted",
        triggerConfig: body.triggerConfig as
          | {
              pageUrl?: string;
              delayMs?: number;
              sampleRate?: number;
            }
          | undefined,
        questions: questions.map(
          (q: Record<string, unknown>, index: number) => ({
            type: requireStr(q.type, "type") as
              | "rating"
              | "nps"
              | "text"
              | "single_choice"
              | "multiple_choice"
              | "boolean",
            title: requireStr(q.title, "title"),
            description: str(q.description),
            required: bool(q.required) ?? true,
            order: (num(q.order) ?? index) as number,
            config: q.config as
              | {
                  minValue?: number;
                  maxValue?: number;
                  minLabel?: string;
                  maxLabel?: string;
                  choices?: string[];
                  placeholder?: string;
                  maxLength?: number;
                }
              | undefined,
          })
        ),
      });
    }),
  });

  http.route({
    path: "/api/v1/admin/survey/update-status",
    method: "POST",
    handler: adminPost((ctx, _auth, body) =>
      ctx.runMutation(internal.admin_api.survey.updateSurveyStatus, {
        surveyId: parseId<"surveys">(str(body.surveyId), "surveyId"),
        status: requireStr(body.status, "status") as
          | "draft"
          | "active"
          | "paused"
          | "closed",
      })
    ),
  });

  http.route({
    path: "/api/v1/admin/survey/delete",
    method: "POST",
    handler: adminPost((ctx, _auth, body) =>
      ctx.runMutation(internal.admin_api.survey.deleteSurvey, {
        surveyId: parseId<"surveys">(str(body.surveyId), "surveyId"),
      })
    ),
  });

  http.route({
    path: "/api/v1/admin/survey/analytics",
    method: "GET",
    handler: adminGet((ctx, _auth, url) =>
      ctx.runQuery(internal.admin_api.survey.getAnalytics, {
        surveyId: parseId<"surveys">(url.searchParams.get("id"), "id"),
      })
    ),
  });

  http.route({
    path: "/api/v1/admin/survey/duplicate",
    method: "POST",
    handler: adminPost((ctx, _auth, body) =>
      ctx.runMutation(internal.admin_api.survey.duplicateSurvey, {
        surveyId: parseId<"surveys">(str(body.surveyId), "surveyId"),
        title: str(body.title),
      })
    ),
  });

  http.route({
    path: "/api/v1/admin/survey/update",
    method: "POST",
    handler: adminPost((ctx, _auth, body) =>
      ctx.runMutation(internal.admin_api.survey.updateSurvey, {
        surveyId: parseId<"surveys">(str(body.surveyId), "surveyId"),
        title: str(body.title),
        description: str(body.description),
        triggerType: str(body.triggerType) as
          | "manual"
          | "page_visit"
          | "time_delay"
          | "exit_intent"
          | "feedback_submitted"
          | undefined,
        triggerConfig: body.triggerConfig as
          | {
              pageUrl?: string;
              delayMs?: number;
              sampleRate?: number;
            }
          | undefined,
        maxResponses: num(body.maxResponses),
      })
    ),
  });

  http.route({
    path: "/api/v1/admin/survey/responses",
    method: "GET",
    handler: adminGet((ctx, _auth, url) => {
      const statusParam = url.searchParams.get("status");
      const limitParam = url.searchParams.get("limit");
      return ctx.runQuery(internal.admin_api.survey.listResponses, {
        surveyId: parseId<"surveys">(
          requireStr(url.searchParams.get("id"), "id"),
          "id"
        ),
        status: (statusParam ?? undefined) as
          | "in_progress"
          | "completed"
          | "abandoned"
          | undefined,
        limit: limitParam ? Number.parseInt(limitParam, 10) : undefined,
      });
    }),
  });

  // --- CORS preflight for all admin content routes ---
  for (const path of ADMIN_CONTENT_PATHS) {
    http.route({ path, method: "OPTIONS", handler: corsOptionsHandler() });
  }
}
