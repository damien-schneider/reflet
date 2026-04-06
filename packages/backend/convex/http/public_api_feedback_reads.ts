import type { httpRouter } from "convex/server";
import { internal } from "../_generated/api";
import { httpAction } from "../_generated/server";
import { parseId } from "./helpers";
import {
  authenticateApiRequest,
  checkOrganizationAccess,
} from "./lib/api_auth";
import {
  errorResponse,
  jsonResponse,
  parseEnumParam,
  parseOptionalId,
} from "./lib/api_helpers";

type Router = ReturnType<typeof httpRouter>;

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

export function registerFeedbackReadRoutes(http: Router): void {
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
          internal.feedback.api_public_queries.getOrganizationConfig,
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
          internal.feedback.api_public_queries.listFeedbackByOrganization,
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
          internal.feedback.api_public_reads.getFeedbackByOrganization,
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
          internal.feedback.api_public_reads.searchSimilarFeedback,
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
          internal.feedback.api_public_reads.listCommentsByOrganization,
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
          internal.feedback.api_public_reads.getRoadmapByOrganization,
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
          internal.feedback.api_public_reads.getChangelogByOrganization,
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
}
