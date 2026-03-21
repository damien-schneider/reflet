import type { httpRouter } from "convex/server";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import {
  adminPost,
  corsOptionsHandler,
  num,
  optionalId,
  parseId,
  requireStr,
  str,
  strArr,
} from "./http_admin_helpers";

type Router = ReturnType<typeof httpRouter>;

const ADMIN_FEEDBACK_PATHS = [
  "/api/v1/admin/feedback/update",
  "/api/v1/admin/feedback/delete",
  "/api/v1/admin/feedback/restore",
  "/api/v1/admin/feedback/assign",
  "/api/v1/admin/feedback/set-status",
  "/api/v1/admin/feedback/update-tags",
  "/api/v1/admin/feedback/update-analysis",
  "/api/v1/admin/comment/update",
  "/api/v1/admin/comment/delete",
  "/api/v1/admin/comment/mark-official",
] as const;

export function registerAdminFeedbackRoutes(http: Router): void {
  // --- Feedback mutations ---

  http.route({
    path: "/api/v1/admin/feedback/update",
    method: "POST",
    handler: adminPost(async (ctx, { organizationId }, body) =>
      ctx.runMutation(internal.admin_api_feedback.updateFeedback, {
        organizationId,
        feedbackId: parseId<"feedback">(str(body.feedbackId), "feedbackId"),
        title: str(body.title),
        description: str(body.description),
      })
    ),
  });

  http.route({
    path: "/api/v1/admin/feedback/delete",
    method: "POST",
    handler: adminPost(async (ctx, { organizationId }, body) =>
      ctx.runMutation(internal.admin_api_feedback.deleteFeedback, {
        organizationId,
        feedbackId: parseId<"feedback">(str(body.feedbackId), "feedbackId"),
      })
    ),
  });

  http.route({
    path: "/api/v1/admin/feedback/restore",
    method: "POST",
    handler: adminPost(async (ctx, { organizationId }, body) =>
      ctx.runMutation(internal.admin_api_feedback.restoreFeedback, {
        organizationId,
        feedbackId: parseId<"feedback">(str(body.feedbackId), "feedbackId"),
      })
    ),
  });

  http.route({
    path: "/api/v1/admin/feedback/assign",
    method: "POST",
    handler: adminPost(async (ctx, { organizationId }, body) =>
      ctx.runMutation(internal.admin_api_feedback.assignFeedback, {
        organizationId,
        feedbackId: parseId<"feedback">(str(body.feedbackId), "feedbackId"),
        assigneeId: str(body.assigneeId),
      })
    ),
  });

  http.route({
    path: "/api/v1/admin/feedback/set-status",
    method: "POST",
    handler: adminPost(async (ctx, { organizationId }, body) =>
      ctx.runMutation(internal.admin_api_feedback.setFeedbackStatus, {
        organizationId,
        feedbackId: parseId<"feedback">(str(body.feedbackId), "feedbackId"),
        statusId: optionalId<"organizationStatuses">(body.statusId),
        status: str(body.status) as
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
    path: "/api/v1/admin/feedback/update-tags",
    method: "POST",
    handler: adminPost(async (ctx, { organizationId }, body) =>
      ctx.runMutation(internal.admin_api_feedback.updateFeedbackTags, {
        organizationId,
        feedbackId: parseId<"feedback">(str(body.feedbackId), "feedbackId"),
        addTagIds: strArr(body.addTagIds) as Id<"tags">[] | undefined,
        removeTagIds: strArr(body.removeTagIds) as Id<"tags">[] | undefined,
      })
    ),
  });

  http.route({
    path: "/api/v1/admin/feedback/update-analysis",
    method: "POST",
    handler: adminPost(async (ctx, { organizationId }, body) =>
      ctx.runMutation(internal.admin_api_feedback.updateFeedbackAnalysis, {
        organizationId,
        feedbackId: parseId<"feedback">(str(body.feedbackId), "feedbackId"),
        priority: str(body.priority) as
          | "critical"
          | "high"
          | "medium"
          | "low"
          | "none"
          | undefined,
        complexity: str(body.complexity) as
          | "trivial"
          | "simple"
          | "moderate"
          | "complex"
          | "very_complex"
          | undefined,
        timeEstimate: str(body.timeEstimate),
        deadline: num(body.deadline),
      })
    ),
  });

  // --- Comment mutations ---

  http.route({
    path: "/api/v1/admin/comment/update",
    method: "POST",
    handler: adminPost(async (ctx, { organizationId }, body) =>
      ctx.runMutation(internal.admin_api_feedback.updateComment, {
        organizationId,
        commentId: parseId<"comments">(str(body.commentId), "commentId"),
        body: requireStr(body.body, "body"),
      })
    ),
  });

  http.route({
    path: "/api/v1/admin/comment/delete",
    method: "POST",
    handler: adminPost(async (ctx, { organizationId }, body) =>
      ctx.runMutation(internal.admin_api_feedback.deleteComment, {
        organizationId,
        commentId: parseId<"comments">(str(body.commentId), "commentId"),
      })
    ),
  });

  http.route({
    path: "/api/v1/admin/comment/mark-official",
    method: "POST",
    handler: adminPost(async (ctx, { organizationId }, body) =>
      ctx.runMutation(internal.admin_api_feedback.markCommentOfficial, {
        organizationId,
        commentId: parseId<"comments">(str(body.commentId), "commentId"),
        isOfficial: body.isOfficial === true,
      })
    ),
  });

  // --- CORS preflight for all admin feedback/comment routes ---
  for (const path of ADMIN_FEEDBACK_PATHS) {
    http.route({ path, method: "OPTIONS", handler: corsOptionsHandler() });
  }
}
