import type { httpRouter } from "convex/server";
import { z } from "zod";
import { internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import { httpAction } from "../_generated/server";
import { parseId, parseJsonBody } from "./helpers";
import {
  authenticateApiRequest,
  checkOrganizationAccess,
} from "./lib/api_auth";
import {
  corsPreflightResponse,
  errorResponse,
  jsonResponse,
  optionalNumberField,
  optionalStringField,
  parseEnumParam,
  parseOptionalId,
  stringFieldOr,
} from "./lib/api_helpers";

type Router = ReturnType<typeof httpRouter>;

// ============================================
// SCHEMAS
// ============================================

const createFeedbackSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  tagId: z.string().optional(),
});

const voteFeedbackSchema = z.object({
  feedbackId: z.string().optional(),
  voteType: z.enum(["upvote", "downvote"]).optional(),
});

const commentBodySchema = z.object({
  feedbackId: z.string().optional(),
  body: z.string().optional(),
  parentId: z.string().optional(),
});

const feedbackIdBodySchema = z.object({
  feedbackId: z.string().optional(),
});

const FEEDBACK_STATUSES = [
  "open",
  "under_review",
  "planned",
  "in_progress",
  "completed",
  "closed",
] as const;
const FEEDBACK_SORT_OPTIONS = [
  "votes",
  "newest",
  "oldest",
  "comments",
] as const;
const COMMENTS_SORT_OPTIONS = ["newest", "oldest"] as const;

// ============================================
// ROUTE REGISTRATION
// ============================================

export function registerPublicApiRoutes(http: Router): void {
  // CORS preflight handler for all API routes
  for (const path of [
    "/api/v1/feedback",
    "/api/v1/feedback/list",
    "/api/v1/feedback/item",
    "/api/v1/feedback/create",
    "/api/v1/feedback/vote",
    "/api/v1/feedback/comments",
    "/api/v1/feedback/comment",
    "/api/v1/feedback/subscribe",
    "/api/v1/feedback/unsubscribe",
    "/api/v1/feedback/roadmap",
    "/api/v1/feedback/changelog",
    "/api/v1/feedback/similar",
    "/api/v1/feedback/screenshot/upload-url",
    "/api/v1/feedback/screenshot/save",
    "/api/v1/surveys/active",
    "/api/v1/surveys/respond/start",
    "/api/v1/surveys/respond/answer",
    "/api/v1/surveys/respond/complete",
  ] as const) {
    http.route({
      path,
      method: "OPTIONS",
      handler: httpAction(async () => corsPreflightResponse()),
    });
  }

  // GET /api/v1/feedback - Get organization config
  http.route({
    path: "/api/v1/feedback",
    method: "GET",
    handler: httpAction(async (ctx, request) => {
      try {
        const authResult = await authenticateApiRequest(ctx, request);
        if (!authResult.success) {
          return authResult.response;
        }

        const { organizationId, isSecretKey } = authResult.auth;

        const config = await ctx.runQuery(
          internal.feedback.api_public.getOrganizationConfig,
          { organizationId }
        );

        if (!config) {
          return errorResponse("Organization not found", 404);
        }

        if (!(config.isPublic || isSecretKey)) {
          return errorResponse(
            "This organization is not public. Use a secret key for private access.",
            403
          );
        }

        return jsonResponse(config);
      } catch (error) {
        return errorResponse(
          error instanceof Error ? error.message : "Internal server error",
          500
        );
      }
    }),
  });

  // GET /api/v1/feedback/list - List feedback items
  http.route({
    path: "/api/v1/feedback/list",
    method: "GET",
    handler: httpAction(async (ctx, request) => {
      try {
        const authResult = await authenticateApiRequest(ctx, request);
        if (!authResult.success) {
          return authResult.response;
        }

        const { organizationId, externalUserId, isSecretKey } = authResult.auth;

        const url = new URL(request.url);
        const statusId = url.searchParams.get("statusId");
        const tagId = url.searchParams.get("tagId");
        const status = parseEnumParam(
          url.searchParams.get("status"),
          FEEDBACK_STATUSES
        );
        const search = url.searchParams.get("search");
        const sortBy = parseEnumParam(
          url.searchParams.get("sortBy"),
          FEEDBACK_SORT_OPTIONS
        );
        const limit = url.searchParams.get("limit");
        const offset = url.searchParams.get("offset");

        const access = await checkOrganizationAccess(
          ctx,
          organizationId,
          isSecretKey
        );
        if (!access.allowed) {
          return access.response;
        }

        const result = await ctx.runQuery(
          internal.feedback.api_public.listFeedbackByOrganization,
          {
            organizationId,
            statusId: parseOptionalId<"organizationStatuses">(statusId),
            tagId: parseOptionalId<"tags">(tagId),
            status: status ?? undefined,
            search: search ?? undefined,
            sortBy: sortBy ?? undefined,
            limit: limit ? Number.parseInt(limit, 10) : undefined,
            offset: offset ? Number.parseInt(offset, 10) : undefined,
            externalUserId,
          }
        );

        return jsonResponse(result);
      } catch (error) {
        return errorResponse(
          error instanceof Error ? error.message : "Internal server error",
          500
        );
      }
    }),
  });

  // GET /api/v1/feedback/item - Get single feedback item
  http.route({
    path: "/api/v1/feedback/item",
    method: "GET",
    handler: httpAction(async (ctx, request) => {
      try {
        const authResult = await authenticateApiRequest(ctx, request);
        if (!authResult.success) {
          return authResult.response;
        }

        const { organizationId, externalUserId, isSecretKey } = authResult.auth;

        const url = new URL(request.url);
        const feedbackIdParam = url.searchParams.get("id");

        if (!feedbackIdParam) {
          return errorResponse("Missing feedback ID", 400);
        }

        const feedbackId = parseId<"feedback">(feedbackIdParam, "id");

        const access = await checkOrganizationAccess(
          ctx,
          organizationId,
          isSecretKey
        );
        if (!access.allowed) {
          return access.response;
        }

        const result = await ctx.runQuery(
          internal.feedback.api_public.getFeedbackByOrganization,
          {
            organizationId,
            feedbackId,
            externalUserId,
          }
        );

        if (!result) {
          return errorResponse("Feedback not found", 404);
        }

        return jsonResponse(result);
      } catch (error) {
        return errorResponse(
          error instanceof Error ? error.message : "Internal server error",
          500
        );
      }
    }),
  });

  // GET /api/v1/feedback/similar - Search for similar feedback ("Did you mean?")
  http.route({
    path: "/api/v1/feedback/similar",
    method: "GET",
    handler: httpAction(async (ctx, request) => {
      try {
        const authResult = await authenticateApiRequest(ctx, request);
        if (!authResult.success) {
          return authResult.response;
        }

        const { organizationId } = authResult.auth;
        const url = new URL(request.url);
        const title = url.searchParams.get("title");

        if (!title || title.length < 3) {
          return jsonResponse([]);
        }

        const results = await ctx.runQuery(
          internal.feedback.api_public.searchSimilarFeedback,
          { organizationId, title }
        );

        return jsonResponse(results);
      } catch (error) {
        return errorResponse(
          error instanceof Error ? error.message : "Internal server error",
          500
        );
      }
    }),
  });

  // POST /api/v1/feedback/create - Create new feedback
  http.route({
    path: "/api/v1/feedback/create",
    method: "POST",
    handler: httpAction(async (ctx, request) => {
      try {
        const authResult = await authenticateApiRequest(ctx, request);
        if (!authResult.success) {
          return authResult.response;
        }

        const { organizationId, externalUserId, isSecretKey } = authResult.auth;

        let body: z.infer<typeof createFeedbackSchema>;
        try {
          body = createFeedbackSchema.parse(await request.json());
        } catch {
          return errorResponse("Invalid JSON body", 400);
        }
        const { title, description, tagId } = body;

        if (!(title && description)) {
          return errorResponse("Title and description are required", 400);
        }

        const access = await checkOrganizationAccess(
          ctx,
          organizationId,
          isSecretKey
        );
        if (!access.allowed) {
          return access.response;
        }

        const result = await ctx.runMutation(
          internal.feedback.api_public.createFeedbackByOrganization,
          {
            organizationId,
            title,
            description,
            tagId: parseOptionalId<"tags">(tagId),
            externalUserId,
          }
        );

        return jsonResponse(result, 201);
      } catch (error) {
        return errorResponse(
          error instanceof Error ? error.message : "Failed to create feedback",
          500
        );
      }
    }),
  });

  // POST /api/v1/feedback/vote - Vote on feedback
  http.route({
    path: "/api/v1/feedback/vote",
    method: "POST",
    handler: httpAction(async (ctx, request) => {
      try {
        const authResult = await authenticateApiRequest(ctx, request);
        if (!authResult.success) {
          return authResult.response;
        }

        const { organizationId, externalUserId, isSecretKey } = authResult.auth;

        if (!externalUserId) {
          return errorResponse(
            "User identification required. Provide X-User-Token header.",
            401
          );
        }

        let body: z.infer<typeof voteFeedbackSchema>;
        try {
          body = voteFeedbackSchema.parse(await request.json());
        } catch {
          return errorResponse("Invalid JSON body", 400);
        }
        const { feedbackId, voteType } = body;

        if (!feedbackId) {
          return errorResponse("Feedback ID is required", 400);
        }

        const access = await checkOrganizationAccess(
          ctx,
          organizationId,
          isSecretKey
        );
        if (!access.allowed) {
          return access.response;
        }

        const result = await ctx.runMutation(
          internal.feedback.api_public.voteFeedbackByOrganization,
          {
            organizationId,
            feedbackId: parseId<"feedback">(feedbackId, "feedbackId"),
            externalUserId,
            voteType,
          }
        );

        return jsonResponse(result);
      } catch (error) {
        return errorResponse(
          error instanceof Error ? error.message : "Failed to vote",
          500
        );
      }
    }),
  });

  // GET /api/v1/feedback/comments - List comments for feedback
  http.route({
    path: "/api/v1/feedback/comments",
    method: "GET",
    handler: httpAction(async (ctx, request) => {
      try {
        const authResult = await authenticateApiRequest(ctx, request);
        if (!authResult.success) {
          return authResult.response;
        }

        const { organizationId } = authResult.auth;
        const url = new URL(request.url);
        const feedbackIdParam = url.searchParams.get("feedbackId");
        const sortBy = parseEnumParam(
          url.searchParams.get("sortBy"),
          COMMENTS_SORT_OPTIONS
        );

        if (!feedbackIdParam) {
          return errorResponse("Feedback ID is required", 400);
        }

        const feedbackId = parseId<"feedback">(feedbackIdParam, "feedbackId");

        const result = await ctx.runQuery(
          internal.feedback.api_public.listCommentsByOrganization,
          {
            organizationId,
            feedbackId,
            sortBy: sortBy ?? undefined,
          }
        );

        return jsonResponse(result);
      } catch (error) {
        return errorResponse(
          error instanceof Error ? error.message : "Internal server error",
          500
        );
      }
    }),
  });

  // POST /api/v1/feedback/comment - Add comment to feedback
  http.route({
    path: "/api/v1/feedback/comment",
    method: "POST",
    handler: httpAction(async (ctx, request) => {
      try {
        const authResult = await authenticateApiRequest(ctx, request);
        if (!authResult.success) {
          return authResult.response;
        }

        const { organizationId, externalUserId } = authResult.auth;

        if (!externalUserId) {
          return errorResponse(
            "User identification required. Provide X-User-Token header.",
            401
          );
        }

        let body: z.infer<typeof commentBodySchema>;
        try {
          body = commentBodySchema.parse(await request.json());
        } catch {
          return errorResponse("Invalid JSON body", 400);
        }

        if (!(body.feedbackId && body.body)) {
          return errorResponse(
            "Feedback ID and comment body are required",
            400
          );
        }

        const result = await ctx.runMutation(
          internal.feedback.api_public.addCommentByOrganization,
          {
            organizationId,
            feedbackId: parseId<"feedback">(body.feedbackId, "feedbackId"),
            body: body.body,
            parentId: parseOptionalId<"comments">(body.parentId),
            externalUserId,
          }
        );

        return jsonResponse(result, 201);
      } catch (error) {
        return errorResponse(
          error instanceof Error ? error.message : "Failed to add comment",
          500
        );
      }
    }),
  });

  // POST /api/v1/feedback/subscribe - Subscribe to feedback updates
  http.route({
    path: "/api/v1/feedback/subscribe",
    method: "POST",
    handler: httpAction(async (ctx, request) => {
      const authResult = await authenticateApiRequest(ctx, request);
      if (!authResult.success) {
        return authResult.response;
      }

      const { organizationId, externalUserId } = authResult.auth;

      if (!externalUserId) {
        return errorResponse(
          "User identification required. Provide X-User-Token header.",
          401
        );
      }

      const body = feedbackIdBodySchema.parse(await request.json());

      if (!body.feedbackId) {
        return errorResponse("Feedback ID is required", 400);
      }

      try {
        const result = await ctx.runMutation(
          internal.feedback.api_public.subscribeFeedbackByOrganization,
          {
            organizationId,
            feedbackId: parseId<"feedback">(body.feedbackId, "feedbackId"),
            externalUserId,
          }
        );

        return jsonResponse(result);
      } catch (error) {
        return errorResponse(
          error instanceof Error ? error.message : "Failed to subscribe",
          400
        );
      }
    }),
  });

  // POST /api/v1/feedback/unsubscribe - Unsubscribe from feedback updates
  http.route({
    path: "/api/v1/feedback/unsubscribe",
    method: "POST",
    handler: httpAction(async (ctx, request) => {
      const authResult = await authenticateApiRequest(ctx, request);
      if (!authResult.success) {
        return authResult.response;
      }

      const { organizationId, externalUserId } = authResult.auth;

      if (!externalUserId) {
        return errorResponse(
          "User identification required. Provide X-User-Token header.",
          401
        );
      }

      const body = feedbackIdBodySchema.parse(await request.json());

      if (!body.feedbackId) {
        return errorResponse("Feedback ID is required", 400);
      }

      try {
        const result = await ctx.runMutation(
          internal.feedback.api_public.unsubscribeFeedbackByOrganization,
          {
            organizationId,
            feedbackId: parseId<"feedback">(body.feedbackId, "feedbackId"),
            externalUserId,
          }
        );

        return jsonResponse(result);
      } catch (error) {
        return errorResponse(
          error instanceof Error ? error.message : "Failed to unsubscribe",
          400
        );
      }
    }),
  });

  // GET /api/v1/feedback/roadmap - Get roadmap data
  http.route({
    path: "/api/v1/feedback/roadmap",
    method: "GET",
    handler: httpAction(async (ctx, request) => {
      try {
        const authResult = await authenticateApiRequest(ctx, request);
        if (!authResult.success) {
          return authResult.response;
        }

        const { organizationId } = authResult.auth;

        const result = await ctx.runQuery(
          internal.feedback.api_public.getRoadmapByOrganization,
          { organizationId }
        );

        if (!result) {
          return errorResponse("Roadmap not found", 404);
        }

        return jsonResponse(result);
      } catch (error) {
        return errorResponse(
          error instanceof Error ? error.message : "Internal server error",
          500
        );
      }
    }),
  });

  // GET /api/v1/feedback/changelog - Get changelog/releases
  http.route({
    path: "/api/v1/feedback/changelog",
    method: "GET",
    handler: httpAction(async (ctx, request) => {
      try {
        const authResult = await authenticateApiRequest(ctx, request);
        if (!authResult.success) {
          return authResult.response;
        }

        const { organizationId } = authResult.auth;
        const url = new URL(request.url);
        const limit = url.searchParams.get("limit");

        const result = await ctx.runQuery(
          internal.feedback.api_public.getChangelogByOrganization,
          {
            organizationId,
            limit: limit ? Number.parseInt(limit, 10) : undefined,
          }
        );

        return jsonResponse(result);
      } catch (error) {
        return errorResponse(
          error instanceof Error ? error.message : "Internal server error",
          500
        );
      }
    }),
  });

  // POST /api/v1/feedback/screenshot/upload-url - Generate upload URL for screenshot
  http.route({
    path: "/api/v1/feedback/screenshot/upload-url",
    method: "POST",
    handler: httpAction(async (ctx, request) => {
      try {
        const authResult = await authenticateApiRequest(ctx, request);
        if (!authResult.success) {
          return authResult.response;
        }

        const uploadUrl = await ctx.runMutation(
          internal.feedback.screenshots.generatePublicUploadUrl,
          {}
        );

        return jsonResponse({ uploadUrl });
      } catch (error) {
        return errorResponse(
          error instanceof Error ? error.message : "Internal server error",
          500
        );
      }
    }),
  });

  // POST /api/v1/feedback/screenshot/save - Save screenshot metadata after upload
  http.route({
    path: "/api/v1/feedback/screenshot/save",
    method: "POST",
    handler: httpAction(async (ctx, request) => {
      try {
        const authResult = await authenticateApiRequest(ctx, request);
        if (!authResult.success) {
          return authResult.response;
        }

        const { externalUserId } = authResult.auth;

        const bodyResult = await parseJsonBody(request);
        if (!bodyResult.success) {
          return bodyResult.response;
        }
        const { body } = bodyResult;

        const feedbackId = body.feedbackId as string | undefined;
        const storageId = body.storageId as string | undefined;

        if (!(feedbackId && storageId)) {
          return errorResponse("feedbackId and storageId are required", 400);
        }

        const screenshotId = await ctx.runMutation(
          internal.feedback.screenshots.saveScreenshotPublic,
          {
            feedbackId: feedbackId as Id<"feedback">,
            storageId: storageId as Id<"_storage">,
            filename: stringFieldOr(body, "filename", "screenshot.png"),
            mimeType: stringFieldOr(body, "mimeType", "image/png"),
            size: optionalNumberField(body, "size") ?? 0,
            width: optionalNumberField(body, "width"),
            height: optionalNumberField(body, "height"),
            captureSource: "widget",
            pageUrl: optionalStringField(body, "pageUrl"),
            externalUserId,
          }
        );

        return jsonResponse({ screenshotId });
      } catch (error) {
        return errorResponse(
          error instanceof Error ? error.message : "Internal server error",
          500
        );
      }
    }),
  });

  // ============================================
  // SURVEY ROUTES
  // ============================================

  // GET /api/v1/surveys/active - Get active survey for widget
  http.route({
    path: "/api/v1/surveys/active",
    method: "GET",
    handler: httpAction(async (ctx, request) => {
      try {
        const authResult = await authenticateApiRequest(ctx, request);
        if (!authResult.success) {
          return authResult.response;
        }

        const { organizationId } = authResult.auth;

        const url = new URL(request.url);
        const triggerType = url.searchParams.get("triggerType") || undefined;

        const survey = await ctx.runQuery(
          internal.surveys.mutations.getActiveSurvey,
          {
            organizationId,
            triggerType: triggerType as
              | "manual"
              | "page_visit"
              | "time_delay"
              | "exit_intent"
              | "feedback_submitted"
              | undefined,
          }
        );

        return jsonResponse(survey);
      } catch (error) {
        return errorResponse(
          error instanceof Error ? error.message : "Internal server error",
          500
        );
      }
    }),
  });

  // POST /api/v1/surveys/respond/start - Start a survey response
  http.route({
    path: "/api/v1/surveys/respond/start",
    method: "POST",
    handler: httpAction(async (ctx, request) => {
      try {
        const authResult = await authenticateApiRequest(ctx, request);
        if (!authResult.success) {
          return authResult.response;
        }

        const { organizationId, externalUserId } = authResult.auth;

        let body: Record<string, unknown>;
        try {
          const raw: unknown = await request.json();
          if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
            return errorResponse("Invalid JSON body", 400);
          }
          body = raw as Record<string, unknown>;
        } catch {
          return errorResponse("Invalid JSON body", 400);
        }

        const surveyId = body.surveyId as string | undefined;
        if (!surveyId) {
          return errorResponse("surveyId is required", 400);
        }

        const responseId = await ctx.runMutation(
          internal.surveys.mutations.startResponse,
          {
            surveyId: surveyId as Id<"surveys">,
            organizationId,
            externalUserId,
            respondentId:
              typeof body.respondentId === "string"
                ? body.respondentId
                : undefined,
            pageUrl:
              typeof body.pageUrl === "string" ? body.pageUrl : undefined,
            userAgent:
              typeof body.userAgent === "string" ? body.userAgent : undefined,
          }
        );

        return jsonResponse({ responseId });
      } catch (error) {
        return errorResponse(
          error instanceof Error ? error.message : "Internal server error",
          500
        );
      }
    }),
  });

  // POST /api/v1/surveys/respond/answer - Submit an answer
  http.route({
    path: "/api/v1/surveys/respond/answer",
    method: "POST",
    handler: httpAction(async (ctx, request) => {
      try {
        const authResult = await authenticateApiRequest(ctx, request);
        if (!authResult.success) {
          return authResult.response;
        }

        let body: Record<string, unknown>;
        try {
          const raw: unknown = await request.json();
          if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
            return errorResponse("Invalid JSON body", 400);
          }
          body = raw as Record<string, unknown>;
        } catch {
          return errorResponse("Invalid JSON body", 400);
        }

        const responseId = body.responseId as string | undefined;
        const questionId = body.questionId as string | undefined;
        const value = body.value;

        if (!(responseId && questionId) || value === undefined) {
          return errorResponse(
            "responseId, questionId, and value are required",
            400
          );
        }

        const answerId = await ctx.runMutation(
          internal.surveys.mutations.submitAnswer,
          {
            responseId: responseId as Id<"surveyResponses">,
            questionId: questionId as Id<"surveyQuestions">,
            value: value as string | number | boolean | string[],
          }
        );

        return jsonResponse({ answerId });
      } catch (error) {
        return errorResponse(
          error instanceof Error ? error.message : "Internal server error",
          500
        );
      }
    }),
  });

  // POST /api/v1/surveys/respond/complete - Complete a survey response
  http.route({
    path: "/api/v1/surveys/respond/complete",
    method: "POST",
    handler: httpAction(async (ctx, request) => {
      try {
        const authResult = await authenticateApiRequest(ctx, request);
        if (!authResult.success) {
          return authResult.response;
        }

        let body: Record<string, unknown>;
        try {
          const raw: unknown = await request.json();
          if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
            return errorResponse("Invalid JSON body", 400);
          }
          body = raw as Record<string, unknown>;
        } catch {
          return errorResponse("Invalid JSON body", 400);
        }

        const responseId = body.responseId as string | undefined;
        if (!responseId) {
          return errorResponse("responseId is required", 400);
        }

        await ctx.runMutation(internal.surveys.mutations.completeResponse, {
          responseId: responseId as Id<"surveyResponses">,
        });

        return jsonResponse({ success: true });
      } catch (error) {
        return errorResponse(
          error instanceof Error ? error.message : "Internal server error",
          500
        );
      }
    }),
  });
}
