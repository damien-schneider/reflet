import type { httpRouter } from "convex/server";
import { z } from "zod";
import { internal } from "../_generated/api";
import type { Id, TableNames } from "../_generated/dataModel";
import { httpAction } from "../_generated/server";
import { decodeUserToken } from "../feedback/api_auth";
import { optionalStorageId, parseId, parseStorageId } from "./helpers";

type Router = ReturnType<typeof httpRouter>;

const PUBLIC_KEY_WRITES_PER_MINUTE = 30;
const SECRET_KEY_WRITES_PER_MINUTE = 300;

// ============================================
// SCHEMAS
// ============================================

const pointSchema = z.object({ x: z.number(), y: z.number() });

/**
 * Widget-reported context. Every bound is a hard cap on what a public client
 * can push into the database, not just a shape check.
 */
const feedbackContextSchema = z.object({
  browser: z.string().max(120).optional(),
  consoleEvents: z
    .array(
      z.object({
        level: z.enum(["error", "warn"]),
        message: z.string().max(1000),
        timestamp: z.number(),
      })
    )
    .max(30)
    .optional(),
  device: z.string().max(40).optional(),
  language: z.string().max(40).optional(),
  metadata: z.record(z.string().max(60), z.string().max(500)).optional(),
  os: z.string().max(60).optional(),
  pageTitle: z.string().max(300).optional(),
  referrer: z.string().max(2000).optional(),
  screen: z.object({ height: z.number(), width: z.number() }).optional(),
  sdkVersion: z.string().max(40).optional(),
  selection: z
    .object({
      componentStack: z.array(z.string().max(120)).max(10),
      html: z.string().max(2000),
      label: z.string().max(200),
      rect: z.object({
        height: z.number(),
        width: z.number(),
        x: z.number(),
        y: z.number(),
      }),
      selector: z.string().max(600),
      sourceLocation: z.string().max(400).optional(),
    })
    .optional(),
  timezone: z.string().max(80).optional(),
  url: z.string().max(2000).optional(),
  userAgent: z.string().max(600).optional(),
  viewport: z
    .object({
      devicePixelRatio: z.number(),
      height: z.number(),
      width: z.number(),
    })
    .optional(),
});

const createFeedbackSchema = z.object({
  context: feedbackContextSchema.optional(),
  description: z.string().optional(),
  tagId: z.string().optional(),
  title: z.string().optional(),
});

const screenshotAnnotationSchema = z.object({
  color: z.string().max(40).optional(),
  endX: z.number().optional(),
  endY: z.number().optional(),
  height: z.number().optional(),
  points: z.array(pointSchema).max(500).optional(),
  text: z.string().max(280).optional(),
  type: z.enum(["rectangle", "arrow", "text", "blur", "pen", "highlight"]),
  width: z.number().optional(),
  x: z.number(),
  y: z.number(),
});

const saveScreenshotSchema = z.object({
  annotatedStorageId: z.string().optional(),
  annotations: z.array(screenshotAnnotationSchema).max(50).optional(),
  feedbackId: z.string(),
  filename: z.string().max(200).optional(),
  height: z.number().optional(),
  mimeType: z.string().max(80).optional(),
  pageUrl: z.string().max(2000).optional(),
  size: z.number().optional(),
  storageId: z.string(),
  width: z.number().optional(),
});

const voteFeedbackSchema = z.object({
  feedbackId: z.string().optional(),
  voteType: z.enum(["upvote", "downvote"]).optional(),
});

const commentBodySchema = z.object({
  body: z.string().optional(),
  feedbackId: z.string().optional(),
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
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-User-Token, X-Visitor-Id",
  "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Max-Age": "86400",
};

function jsonResponse(
  data: unknown,
  status = 200,
  headers: Record<string, string> = {}
): Response {
  return new Response(JSON.stringify(data), {
    headers: {
      "Content-Type": "application/json",
      ...CORS_HEADERS,
      ...headers,
    },
    status,
  });
}

function errorResponse(error: string, status = 400): Response {
  return jsonResponse({ error }, status);
}

function corsPreflightResponse(): Response {
  return new Response(null, { headers: CORS_HEADERS, status: 204 });
}

function parseEnumParam<T extends string>(
  value: string | null,
  validValues: readonly T[]
): T | undefined {
  if (value && (validValues as readonly string[]).includes(value)) {
    return value as T;
  }
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

type AccessCheck =
  | { allowed: true; isPublic: boolean }
  | { allowed: false; response: Response };

async function checkOrganizationExists(
  ctx: Parameters<Parameters<typeof httpAction>[0]>[0],
  organizationId: Id<"organizations">
): Promise<AccessCheck> {
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

  return { allowed: true, isPublic: org.isPublic ?? false };
}

async function checkOrganizationAccess(
  ctx: Parameters<Parameters<typeof httpAction>[0]>[0],
  organizationId: Id<"organizations">,
  isSecretKey: boolean
): Promise<AccessCheck> {
  const found = await checkOrganizationExists(ctx, organizationId);
  if (!found.allowed) {
    return found;
  }

  if (!(found.isPublic || isSecretKey)) {
    return {
      allowed: false,
      response: errorResponse(
        "This organization is not public. Use a secret key for private access.",
        403
      ),
    };
  }

  return found;
}

// Widget ingest: a public key may write into a private org, never read from it.
async function checkWriteQuota(
  ctx: Parameters<Parameters<typeof httpAction>[0]>[0],
  auth: ApiAuthContext
): Promise<AccessCheck> {
  const found = await checkOrganizationExists(ctx, auth.organizationId);
  if (!found.allowed) {
    return found;
  }

  const quota = await ctx.runQuery(internal.feedback.api_auth.checkRateLimit, {
    maxRequests: auth.isSecretKey
      ? SECRET_KEY_WRITES_PER_MINUTE
      : PUBLIC_KEY_WRITES_PER_MINUTE,
    organizationApiKeyId: auth.organizationApiKeyId,
  });

  if (!quota.allowed) {
    return {
      allowed: false,
      response: errorResponse(
        "Too many reports from this key. Try again in a minute.",
        429
      ),
    };
  }

  return found;
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
      response: errorResponse("Missing or invalid Authorization header", 401),
      success: false,
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
      response: errorResponse(validation.error ?? "Invalid API key", 401),
      success: false,
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
          email: decoded.email,
          externalId: decoded.id,
          name: decoded.name,
          organizationId,
        }
      );
      externalUserId = externalUser.externalUserId;
    }
  }

  return {
    auth: {
      externalUserId,
      isSecretKey,
      organizationApiKeyId,
      organizationId,
    },
    success: true,
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
    "/api/v1/feedback/similar",
    "/api/v1/feedback/screenshot/upload-url",
    "/api/v1/feedback/screenshot/save",
    "/api/v1/surveys/active",
    "/api/v1/surveys/respond/start",
    "/api/v1/surveys/respond/answer",
    "/api/v1/surveys/respond/complete",
  ] as const) {
    http.route({
      handler: httpAction(async () => corsPreflightResponse()),
      method: "OPTIONS",
      path,
    });
  }

  // GET /api/v1/feedback - Get organization config
  http.route({
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
    method: "GET",
    path: "/api/v1/feedback",
  });

  // GET /api/v1/feedback/list - List feedback items
  http.route({
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
            externalUserId,
            limit: limit ? Number.parseInt(limit, 10) : undefined,
            offset: offset ? Number.parseInt(offset, 10) : undefined,
            organizationId,
            search: search ?? undefined,
            sortBy: sortBy ?? undefined,
            status: status ?? undefined,
            statusId: parseOptionalId<"organizationStatuses">(statusId),
            tagId: parseOptionalId<"tags">(tagId),
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
    method: "GET",
    path: "/api/v1/feedback/list",
  });

  // GET /api/v1/feedback/item - Get single feedback item
  http.route({
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
            externalUserId,
            feedbackId,
            organizationId,
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
    method: "GET",
    path: "/api/v1/feedback/item",
  });

  // GET /api/v1/feedback/similar - Search for similar feedback ("Did you mean?")
  http.route({
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
    method: "GET",
    path: "/api/v1/feedback/similar",
  });

  // POST /api/v1/feedback/create - Create new feedback
  http.route({
    handler: httpAction(async (ctx, request) => {
      try {
        const authResult = await authenticateApiRequest(ctx, request);
        if (!authResult.success) {
          return authResult.response;
        }

        const { organizationId, externalUserId } = authResult.auth;

        let body: z.infer<typeof createFeedbackSchema>;
        try {
          body = createFeedbackSchema.parse(await request.json());
        } catch {
          return errorResponse("Invalid JSON body", 400);
        }
        const { title, description, tagId, context } = body;

        if (!(title && description)) {
          return errorResponse("Title and description are required", 400);
        }

        const quota = await checkWriteQuota(ctx, authResult.auth);
        if (!quota.allowed) {
          return quota.response;
        }

        const result = await ctx.runMutation(
          internal.feedback.api_public.createFeedbackByOrganization,
          {
            context,
            description,
            externalUserId,
            organizationId,
            tagId: parseOptionalId<"tags">(tagId),
            title,
          }
        );

        await ctx.runMutation(internal.feedback.api_auth.logApiRequest, {
          endpoint: "/api/v1/feedback/create",
          method: "POST",
          organizationApiKeyId: authResult.auth.organizationApiKeyId,
          organizationId,
          statusCode: 201,
          userAgent: request.headers.get("User-Agent") ?? undefined,
        });

        return jsonResponse(result, 201);
      } catch (error) {
        return errorResponse(
          error instanceof Error ? error.message : "Failed to create feedback",
          500
        );
      }
    }),
    method: "POST",
    path: "/api/v1/feedback/create",
  });

  // POST /api/v1/feedback/vote - Vote on feedback
  http.route({
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
            externalUserId,
            feedbackId: parseId<"feedback">(feedbackId, "feedbackId"),
            organizationId,
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
    method: "POST",
    path: "/api/v1/feedback/vote",
  });

  // GET /api/v1/feedback/comments - List comments for feedback
  http.route({
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
            feedbackId,
            organizationId,
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
    method: "GET",
    path: "/api/v1/feedback/comments",
  });

  // POST /api/v1/feedback/comment - Add comment to feedback
  http.route({
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
            body: body.body,
            externalUserId,
            feedbackId: parseId<"feedback">(body.feedbackId, "feedbackId"),
            organizationId,
            parentId: parseOptionalId<"comments">(body.parentId),
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
    method: "POST",
    path: "/api/v1/feedback/comment",
  });

  // POST /api/v1/feedback/subscribe - Subscribe to feedback updates
  http.route({
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
            externalUserId,
            feedbackId: parseId<"feedback">(body.feedbackId, "feedbackId"),
            organizationId,
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
    method: "POST",
    path: "/api/v1/feedback/subscribe",
  });

  // POST /api/v1/feedback/unsubscribe - Unsubscribe from feedback updates
  http.route({
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
            externalUserId,
            feedbackId: parseId<"feedback">(body.feedbackId, "feedbackId"),
            organizationId,
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
    method: "POST",
    path: "/api/v1/feedback/unsubscribe",
  });

  // GET /api/v1/feedback/roadmap - Get roadmap data
  http.route({
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
    method: "GET",
    path: "/api/v1/feedback/roadmap",
  });

  // GET /api/v1/feedback/changelog - Get changelog/releases
  http.route({
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
            limit: limit ? Number.parseInt(limit, 10) : undefined,
            organizationId,
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
    method: "GET",
    path: "/api/v1/feedback/changelog",
  });

  // POST /api/v1/feedback/screenshot/upload-url - Generate upload URL for screenshot
  http.route({
    handler: httpAction(async (ctx, request) => {
      try {
        const authResult = await authenticateApiRequest(ctx, request);
        if (!authResult.success) {
          return authResult.response;
        }

        const quota = await checkWriteQuota(ctx, authResult.auth);
        if (!quota.allowed) {
          return quota.response;
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
    method: "POST",
    path: "/api/v1/feedback/screenshot/upload-url",
  });

  // POST /api/v1/feedback/screenshot/save - Save screenshot metadata after upload
  http.route({
    handler: httpAction(async (ctx, request) => {
      try {
        const authResult = await authenticateApiRequest(ctx, request);
        if (!authResult.success) {
          return authResult.response;
        }

        const { externalUserId } = authResult.auth;

        let body: z.infer<typeof saveScreenshotSchema>;
        try {
          body = saveScreenshotSchema.parse(await request.json());
        } catch {
          return errorResponse("feedbackId and storageId are required", 400);
        }

        const screenshotId = await ctx.runMutation(
          internal.feedback.screenshots.saveScreenshotPublic,
          {
            annotatedStorageId: optionalStorageId(body.annotatedStorageId),
            annotations: body.annotations,
            captureSource: "widget",
            externalUserId,
            feedbackId: parseId<"feedback">(body.feedbackId, "feedbackId"),
            filename: body.filename ?? "screenshot.png",
            height: body.height,
            mimeType: body.mimeType ?? "image/png",
            pageUrl: body.pageUrl,
            size: body.size ?? 0,
            storageId: parseStorageId(body.storageId, "storageId"),
            width: body.width,
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
    method: "POST",
    path: "/api/v1/feedback/screenshot/save",
  });

  // ============================================
  // SURVEY ROUTES
  // ============================================

  // GET /api/v1/surveys/active - Get active survey for widget
  http.route({
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
    method: "GET",
    path: "/api/v1/surveys/active",
  });

  // POST /api/v1/surveys/respond/start - Start a survey response
  http.route({
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
            externalUserId,
            organizationId,
            pageUrl:
              typeof body.pageUrl === "string" ? body.pageUrl : undefined,
            respondentId:
              typeof body.respondentId === "string"
                ? body.respondentId
                : undefined,
            surveyId: surveyId as Id<"surveys">,
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
    method: "POST",
    path: "/api/v1/surveys/respond/start",
  });

  // POST /api/v1/surveys/respond/answer - Submit an answer
  http.route({
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
            questionId: questionId as Id<"surveyQuestions">,
            responseId: responseId as Id<"surveyResponses">,
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
    method: "POST",
    path: "/api/v1/surveys/respond/answer",
  });

  // POST /api/v1/surveys/respond/complete - Complete a survey response
  http.route({
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
    method: "POST",
    path: "/api/v1/surveys/respond/complete",
  });
}
