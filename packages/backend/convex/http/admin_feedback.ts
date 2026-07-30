import type { httpRouter } from "convex/server";
import { internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import {
  adminPost,
  corsOptionsHandler,
  num,
  optionalId,
  parseId,
  requireStr,
  str,
  strArr,
} from "./helpers";

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
    handler: adminPost(async (ctx, { organizationId }, body) =>
      ctx.runMutation(internal.admin_api.feedback.updateFeedback, {
        description: str(body.description),
        feedbackId: parseId<"feedback">(str(body.feedbackId), "feedbackId"),
        organizationId,
        title: str(body.title),
      })
    ),
    method: "POST",
    path: "/api/v1/admin/feedback/update",
  });

  http.route({
    handler: adminPost(async (ctx, { organizationId }, body) =>
      ctx.runMutation(internal.admin_api.feedback.deleteFeedback, {
        feedbackId: parseId<"feedback">(str(body.feedbackId), "feedbackId"),
        organizationId,
      })
    ),
    method: "POST",
    path: "/api/v1/admin/feedback/delete",
  });

  http.route({
    handler: adminPost(async (ctx, { organizationId }, body) =>
      ctx.runMutation(internal.admin_api.feedback.restoreFeedback, {
        feedbackId: parseId<"feedback">(str(body.feedbackId), "feedbackId"),
        organizationId,
      })
    ),
    method: "POST",
    path: "/api/v1/admin/feedback/restore",
  });

  http.route({
    handler: adminPost(async (ctx, { organizationId }, body) =>
      ctx.runMutation(internal.admin_api.feedback.assignFeedback, {
        assigneeId: str(body.assigneeId),
        feedbackId: parseId<"feedback">(str(body.feedbackId), "feedbackId"),
        organizationId,
      })
    ),
    method: "POST",
    path: "/api/v1/admin/feedback/assign",
  });

  http.route({
    handler: adminPost(async (ctx, { organizationId }, body) =>
      ctx.runMutation(internal.admin_api.feedback.setFeedbackStatus, {
        feedbackId: parseId<"feedback">(str(body.feedbackId), "feedbackId"),
        organizationId,
        status: str(body.status) as
          | "open"
          | "under_review"
          | "planned"
          | "in_progress"
          | "completed"
          | "closed"
          | undefined,
        statusId: optionalId<"organizationStatuses">(body.statusId),
      })
    ),
    method: "POST",
    path: "/api/v1/admin/feedback/set-status",
  });

  http.route({
    handler: adminPost(async (ctx, { organizationId }, body) =>
      ctx.runMutation(internal.admin_api.feedback.updateFeedbackTags, {
        addTagIds: strArr(body.addTagIds) as Id<"tags">[] | undefined,
        feedbackId: parseId<"feedback">(str(body.feedbackId), "feedbackId"),
        organizationId,
        removeTagIds: strArr(body.removeTagIds) as Id<"tags">[] | undefined,
      })
    ),
    method: "POST",
    path: "/api/v1/admin/feedback/update-tags",
  });

  http.route({
    handler: adminPost(async (ctx, { organizationId }, body) =>
      ctx.runMutation(internal.admin_api.feedback.updateFeedbackAnalysis, {
        complexity: str(body.complexity) as
          | "trivial"
          | "simple"
          | "moderate"
          | "complex"
          | "very_complex"
          | undefined,
        deadline: num(body.deadline),
        feedbackId: parseId<"feedback">(str(body.feedbackId), "feedbackId"),
        organizationId,
        priority: str(body.priority) as
          | "critical"
          | "high"
          | "medium"
          | "low"
          | "none"
          | undefined,
        timeEstimate: str(body.timeEstimate),
      })
    ),
    method: "POST",
    path: "/api/v1/admin/feedback/update-analysis",
  });

  // --- Comment mutations ---

  http.route({
    handler: adminPost(async (ctx, { organizationId }, body) =>
      ctx.runMutation(internal.admin_api.feedback.updateComment, {
        body: requireStr(body.body, "body"),
        commentId: parseId<"comments">(str(body.commentId), "commentId"),
        organizationId,
      })
    ),
    method: "POST",
    path: "/api/v1/admin/comment/update",
  });

  http.route({
    handler: adminPost(async (ctx, { organizationId }, body) =>
      ctx.runMutation(internal.admin_api.feedback.deleteComment, {
        commentId: parseId<"comments">(str(body.commentId), "commentId"),
        organizationId,
      })
    ),
    method: "POST",
    path: "/api/v1/admin/comment/delete",
  });

  http.route({
    handler: adminPost(async (ctx, { organizationId }, body) =>
      ctx.runMutation(internal.admin_api.feedback.markCommentOfficial, {
        commentId: parseId<"comments">(str(body.commentId), "commentId"),
        isOfficial: body.isOfficial === true,
        organizationId,
      })
    ),
    method: "POST",
    path: "/api/v1/admin/comment/mark-official",
  });

  // --- CORS preflight for all admin feedback/comment routes ---
  for (const path of ADMIN_FEEDBACK_PATHS) {
    http.route({ handler: corsOptionsHandler(), method: "OPTIONS", path });
  }
}
