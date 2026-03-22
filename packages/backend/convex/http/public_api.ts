import type { httpRouter } from "convex/server";
import { z } from "zod";
import { internal } from "../_generated/api";
import type { Id, TableNames } from "../_generated/dataModel";
import { httpAction } from "../_generated/server";
import { decodeUserToken } from "../feedback/api_auth";

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
// HELPERS
// ============================================

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-User-Token, X-Visitor-Id",
  "Access-Control-Max-Age": "86400",
};

function jsonResponse(
  data: unknown,
  status = 200,
  headers: Record<string, string> = {}
): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...CORS_HEADERS,
      ...headers,
    },
  });
}

function errorResponse(error: string, status = 400): Response {
  return jsonResponse({ error }, status);
}

function corsPreflightResponse(): Response {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

function parseEnumParam<T extends string>(
  value: string | null,
  validValues: readonly T[]
): T | undefined {
  if (value && (validValues as readonly string[]).includes(value)) {
    return value as T;
  }
  return undefined;
}

function parseId<T extends TableNames>(
  value: string | null | undefined,
  fieldName: string
): Id<T> {
  if (!value) {
    throw new Error(`Missing required ID: ${fieldName}`);
  }
  return value as Id<T>;
}

function parseOptionalId<T extends TableNames>(
  value: string | null | undefined
): Id<T> | undefined {
  return value ? (value as Id<T>) : undefined;
}

interface ApiAuthContext {
  externalUserId?: Id<"externalUsers">;
  isSecretKey: boolean;
  organizationApiKeyId: Id<"organizationApiKeys">;
  organizationId: Id<"organizations">;
}

async function checkOrganizationAccess(
  ctx: Parameters<Parameters<typeof httpAction>[0]>[0],
  organizationId: Id<"organizations">,
  isSecretKey: boolean
): Promise<{ allowed: true } | { allowed: false; response: Response }> {
  const org = await ctx.runQuery(
    internal.feedback.api_public.getOrganizationConfig,
    {
      organizationId,
    }
  );

  if (!org) {
    return {
      allowed: false,
      response: errorResponse("Organization not found", 404),
    };
  }

  if (!(org.isPublic || isSecretKey)) {
    return {
      allowed: false,
      response: errorResponse(
        "This organization is not public. Use a secret key for private access.",
        403
      ),
    };
  }

  return { allowed: true };
}

async function authenticateApiRequest(
  ctx: Parameters<Parameters<typeof httpAction>[0]>[0],
  request: Request
): Promise<
  | { success: true; auth: ApiAuthContext }
  | { success: false; response: Response }
> {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return {
      success: false,
      response: errorResponse("Missing or invalid Authorization header", 401),
    };
  }

  const apiKey = authHeader.slice(7);
  const validation = await ctx.runQuery(
    internal.feedback.api_auth.validateApiKey,
    {
      apiKey,
    }
  );

  if (
    !(
      validation.success &&
      validation.organizationId &&
      validation.organizationApiKeyId
    )
  ) {
    return {
      success: false,
      response: errorResponse(validation.error ?? "Invalid API key", 401),
    };
  }

  const organizationId = validation.organizationId;
  const organizationApiKeyId = validation.organizationApiKeyId;
  const isSecretKey = validation.isSecretKey ?? false;

  ctx.runMutation(internal.feedback.api_auth.updateOrganizationApiKeyLastUsed, {
    apiKeyId: organizationApiKeyId,
  });

  const userToken = request.headers.get("X-User-Token");
  let externalUserId: Id<"externalUsers"> | undefined;

  if (userToken) {
    const decoded = decodeUserToken(userToken);
    if (decoded) {
      const externalUser = await ctx.runMutation(
        internal.feedback.api_auth.getOrCreateExternalUser,
        {
          organizationId,
          externalId: decoded.id,
          email: decoded.email,
          name: decoded.name,
        }
      );
      externalUserId = externalUser.externalUserId;
    }
  }

  return {
    success: true,
    auth: {
      organizationId,
      organizationApiKeyId,
      isSecretKey,
      externalUserId,
    },
  };
}

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
        console.error("API error (GET /api/v1/feedback):", error);
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
        console.error("API error (GET /api/v1/feedback/list):", error);
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
        console.error("API error (GET /api/v1/feedback/item):", error);
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
        console.error("API error (POST /api/v1/feedback/create):", error);
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
        console.error("API error (POST /api/v1/feedback/vote):", error);
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
    }),
  });

  // POST /api/v1/feedback/comment - Add comment to feedback
  http.route({
    path: "/api/v1/feedback/comment",
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

      const body = commentBodySchema.parse(await request.json());

      if (!(body.feedbackId && body.body)) {
        return errorResponse("Feedback ID and comment body are required", 400);
      }

      try {
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
          400
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
    }),
  });

  // GET /api/v1/feedback/changelog - Get changelog/releases
  http.route({
    path: "/api/v1/feedback/changelog",
    method: "GET",
    handler: httpAction(async (ctx, request) => {
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
    }),
  });
}
