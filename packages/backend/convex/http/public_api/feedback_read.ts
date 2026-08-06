import type { httpRouter } from "convex/server";
import { internal } from "../../_generated/api";
import { errorResponse, jsonResponse, parseId } from "../helpers";
import {
  checkOrganizationAccess,
  parseEnumParam,
  parseIntParam,
  parseOptionalId,
} from "./auth";
import { publicApiRoute } from "./route";
import {
  COMMENTS_SORT_OPTIONS,
  FEEDBACK_SORT_OPTIONS,
  FEEDBACK_STATUSES,
} from "./schemas";

type Router = ReturnType<typeof httpRouter>;

export function registerFeedbackReadRoutes(http: Router): void {
  // GET /api/v1/feedback - Get organization config
  http.route({
    handler: publicApiRoute(async ({ auth, ctx }) => {
      const access = await checkOrganizationAccess(
        ctx,
        auth.organizationId,
        auth.isSecretKey
      );
      if (!access.allowed) {
        return access.response;
      }

      const config = await ctx.runQuery(
        internal.feedback.api_public.getOrganizationConfig,
        { organizationId: auth.organizationId }
      );

      if (!config) {
        return errorResponse("Organization not found", 404);
      }

      return jsonResponse(config);
    }),
    method: "GET",
    path: "/api/v1/feedback",
  });

  // GET /api/v1/feedback/list - List feedback items
  http.route({
    handler: publicApiRoute(async ({ auth, ctx, url }) => {
      const access = await checkOrganizationAccess(
        ctx,
        auth.organizationId,
        auth.isSecretKey
      );
      if (!access.allowed) {
        return access.response;
      }

      const result = await ctx.runQuery(
        internal.feedback.api_public_list.listFeedbackByOrganization,
        {
          externalUserId: auth.externalUserId,
          limit: parseIntParam(url.searchParams.get("limit")),
          offset: parseIntParam(url.searchParams.get("offset")),
          organizationId: auth.organizationId,
          search: url.searchParams.get("search") ?? undefined,
          sortBy: parseEnumParam(
            url.searchParams.get("sortBy"),
            FEEDBACK_SORT_OPTIONS
          ),
          status: parseEnumParam(
            url.searchParams.get("status"),
            FEEDBACK_STATUSES
          ),
          statusId: parseOptionalId<"organizationStatuses">(
            url.searchParams.get("statusId")
          ),
          tagId: parseOptionalId<"tags">(url.searchParams.get("tagId")),
        }
      );

      return jsonResponse(result);
    }),
    method: "GET",
    path: "/api/v1/feedback/list",
  });

  // GET /api/v1/feedback/item - Get single feedback item
  http.route({
    handler: publicApiRoute(async ({ auth, ctx, url }) => {
      const feedbackIdParam = url.searchParams.get("id");
      if (!feedbackIdParam) {
        return errorResponse("Missing feedback ID", 400);
      }

      const access = await checkOrganizationAccess(
        ctx,
        auth.organizationId,
        auth.isSecretKey
      );
      if (!access.allowed) {
        return access.response;
      }

      const result = await ctx.runQuery(
        internal.feedback.api_public_list.getFeedbackByOrganization,
        {
          externalUserId: auth.externalUserId,
          feedbackId: parseId<"feedback">(feedbackIdParam, "id"),
          includePrivateContext: auth.isSecretKey,
          organizationId: auth.organizationId,
        }
      );

      if (!result) {
        return errorResponse("Feedback not found", 404);
      }

      return jsonResponse(result);
    }),
    method: "GET",
    path: "/api/v1/feedback/item",
  });

  // GET /api/v1/feedback/similar - Search for similar feedback ("Did you mean?")
  http.route({
    handler: publicApiRoute(async ({ auth, ctx, url }) => {
      const access = await checkOrganizationAccess(
        ctx,
        auth.organizationId,
        auth.isSecretKey
      );
      if (!access.allowed) {
        return access.response;
      }

      const title = url.searchParams.get("title");
      if (!title || title.length < 3) {
        return jsonResponse([]);
      }

      const results = await ctx.runQuery(
        internal.feedback.api_public.searchSimilarFeedback,
        { organizationId: auth.organizationId, title }
      );

      return jsonResponse(results);
    }),
    method: "GET",
    path: "/api/v1/feedback/similar",
  });

  // GET /api/v1/feedback/comments - List comments for feedback
  http.route({
    handler: publicApiRoute(async ({ auth, ctx, url }) => {
      const feedbackIdParam = url.searchParams.get("feedbackId");
      if (!feedbackIdParam) {
        return errorResponse("Feedback ID is required", 400);
      }

      const access = await checkOrganizationAccess(
        ctx,
        auth.organizationId,
        auth.isSecretKey
      );
      if (!access.allowed) {
        return access.response;
      }

      const result = await ctx.runQuery(
        internal.feedback.api_public.listCommentsByOrganization,
        {
          feedbackId: parseId<"feedback">(feedbackIdParam, "feedbackId"),
          organizationId: auth.organizationId,
          sortBy: parseEnumParam(
            url.searchParams.get("sortBy"),
            COMMENTS_SORT_OPTIONS
          ),
        }
      );

      return jsonResponse(result);
    }),
    method: "GET",
    path: "/api/v1/feedback/comments",
  });

  // GET /api/v1/feedback/roadmap - Get roadmap data
  http.route({
    handler: publicApiRoute(async ({ auth, ctx }) => {
      const access = await checkOrganizationAccess(
        ctx,
        auth.organizationId,
        auth.isSecretKey
      );
      if (!access.allowed) {
        return access.response;
      }

      const result = await ctx.runQuery(
        internal.feedback.api_public.getRoadmapByOrganization,
        { organizationId: auth.organizationId }
      );

      if (!result) {
        return errorResponse("Roadmap not found", 404);
      }

      return jsonResponse(result);
    }),
    method: "GET",
    path: "/api/v1/feedback/roadmap",
  });

  // GET /api/v1/feedback/changelog - Get changelog/releases
  http.route({
    handler: publicApiRoute(async ({ auth, ctx, url }) => {
      const access = await checkOrganizationAccess(
        ctx,
        auth.organizationId,
        auth.isSecretKey
      );
      if (!access.allowed) {
        return access.response;
      }

      const result = await ctx.runQuery(
        internal.feedback.api_public.getChangelogByOrganization,
        {
          limit: parseIntParam(url.searchParams.get("limit")),
          organizationId: auth.organizationId,
        }
      );

      return jsonResponse(result);
    }),
    method: "GET",
    path: "/api/v1/feedback/changelog",
  });
}
