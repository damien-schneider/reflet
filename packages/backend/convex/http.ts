import { registerRoutes as registerStripeRoutes } from "@convex-dev/stripe";
import { httpRouter } from "convex/server";
import { z } from "zod";
import { components, internal } from "./_generated/api";
import type { Id, TableNames } from "./_generated/dataModel";
import { httpAction } from "./_generated/server";
import { authComponent, createAuth } from "./auth";
import { decodeUserToken } from "./feedback_api_auth";
import { generateRssFeed } from "./rss";

// ============================================
// ZOD SCHEMAS & TYPE-SAFE HELPERS
// ============================================

const webhookInstallationSchema = z.object({ id: z.number() });

const releasePayloadSchema = z.object({
  release: z.object({
    id: z.number(),
    tag_name: z.string(),
    name: z.string().nullable(),
    body: z.string().nullable(),
    html_url: z.string(),
    draft: z.boolean(),
    prerelease: z.boolean(),
    published_at: z.string().nullable(),
    created_at: z.string(),
  }),
  action: z.string(),
  installation: webhookInstallationSchema,
});

const issuePayloadSchema = z.object({
  issue: z.object({
    id: z.number(),
    number: z.number(),
    title: z.string(),
    body: z.string().nullable(),
    html_url: z.string(),
    state: z.enum(["open", "closed"]),
    labels: z.array(z.object({ name: z.string() })),
    user: z.object({ login: z.string(), avatar_url: z.string() }).nullable(),
    milestone: z.object({ title: z.string() }).nullable(),
    assignees: z.array(z.object({ login: z.string() })),
    created_at: z.string(),
    updated_at: z.string(),
    closed_at: z.string().nullable(),
  }),
  action: z.string(),
  installation: webhookInstallationSchema,
});

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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

const http = httpRouter();

// ============================================
// HELPER FUNCTIONS FOR API ROUTES
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

interface ApiAuthContext {
  organizationId: Id<"organizations">;
  organizationApiKeyId: Id<"organizationApiKeys">;
  isSecretKey: boolean;
  externalUserId?: Id<"externalUsers">;
}

/**
 * Check if an organization is accessible (public or using secret key)
 */
async function checkOrganizationAccess(
  ctx: Parameters<Parameters<typeof httpAction>[0]>[0],
  organizationId: Id<"organizations">,
  isSecretKey: boolean
): Promise<{ allowed: true } | { allowed: false; response: Response }> {
  const org = await ctx.runQuery(internal.feedback_api.getOrganizationConfig, {
    organizationId,
  });

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
    internal.feedback_api_auth.validateApiKey,
    {
      apiKey,
    }
  );

  // Check for organization-level auth - extract values with proper type narrowing
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

  // After the above check, these are guaranteed to be defined
  const organizationId = validation.organizationId;
  const organizationApiKeyId = validation.organizationApiKeyId;
  const isSecretKey = validation.isSecretKey ?? false;

  // Update last used timestamp (fire and forget)
  ctx.runMutation(internal.feedback_api_auth.updateOrganizationApiKeyLastUsed, {
    apiKeyId: organizationApiKeyId,
  });

  // Check for user token to identify external user
  const userToken = request.headers.get("X-User-Token");
  let externalUserId: Id<"externalUsers"> | undefined;

  if (userToken) {
    const decoded = decodeUserToken(userToken);
    if (decoded) {
      // Get or create external user
      const externalUser = await ctx.runMutation(
        internal.feedback_api_auth.getOrCreateExternalUser,
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

// Register Better Auth routes
authComponent.registerRoutes(http, createAuth);

// ============================================
// STRIPE WEBHOOK HANDLER
// ============================================

// Register Stripe webhook routes at /stripe/webhook
// The component handles webhook signature verification and subscription sync
registerStripeRoutes(http, components.stripe, {
  webhookPath: "/stripe/webhook",
});

// ============================================
// GITHUB WEBHOOK HANDLER
// ============================================

type WebhookCtx = Parameters<Parameters<typeof httpAction>[0]>[0];

function webhookJson(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

async function handleInstallationWebhook(
  ctx: WebhookCtx,
  payload: Record<string, unknown>
): Promise<Response | null> {
  if (typeof payload.action !== "string" || payload.action !== "deleted") {
    return null;
  }
  const installation = webhookInstallationSchema.parse(payload.installation);
  await ctx.runMutation(internal.github.handleInstallationDeleted, {
    installationId: String(installation.id),
  });
  return webhookJson({ success: true, action: "installation_deleted" });
}

async function handleReleaseWebhook(
  ctx: WebhookCtx,
  payload: Record<string, unknown>
): Promise<Response> {
  const { release, action, installation } = releasePayloadSchema.parse(payload);
  const installationId = String(installation.id);

  const connection = await ctx.runQuery(
    internal.github.getConnectionByInstallation,
    { installationId }
  );

  if (connection) {
    await ctx.runMutation(internal.github_actions.processReleaseWebhook, {
      connectionId: connection._id,
      organizationId: connection.organizationId,
      release: {
        id: String(release.id),
        tagName: release.tag_name,
        name: release.name ?? undefined,
        body: release.body ?? undefined,
        htmlUrl: release.html_url,
        isDraft: release.draft,
        isPrerelease: release.prerelease,
        publishedAt: release.published_at
          ? new Date(release.published_at).getTime()
          : undefined,
        createdAt: new Date(release.created_at).getTime(),
      },
      action,
    });
  }

  return webhookJson({ success: true, action: "release_processed" });
}

async function handleIssueWebhook(
  ctx: WebhookCtx,
  payload: Record<string, unknown>
): Promise<Response> {
  const { issue, action, installation } = issuePayloadSchema.parse(payload);
  const installationId = String(installation.id);

  const connection = await ctx.runQuery(
    internal.github.getConnectionByInstallation,
    { installationId }
  );

  if (connection) {
    await ctx.runMutation(internal.github_actions.processIssueWebhook, {
      connectionId: connection._id,
      organizationId: connection.organizationId,
      issue: {
        id: String(issue.id),
        number: issue.number,
        title: issue.title,
        body: issue.body ?? undefined,
        htmlUrl: issue.html_url,
        state: issue.state,
        labels: issue.labels.map((l) => l.name),
        author: issue.user?.login,
        authorAvatarUrl: issue.user?.avatar_url,
        milestone: issue.milestone?.title,
        assignees: issue.assignees.map((a) => a.login),
        createdAt: new Date(issue.created_at).getTime(),
        updatedAt: new Date(issue.updated_at).getTime(),
        closedAt: issue.closed_at
          ? new Date(issue.closed_at).getTime()
          : undefined,
      },
      action,
    });
  }

  return webhookJson({ success: true, action: "issue_processed" });
}

http.route({
  path: "/github-webhook",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const eventType = request.headers.get("X-GitHub-Event");

    if (!eventType) {
      return new Response("Missing X-GitHub-Event header", { status: 400 });
    }

    const body = await request.text();

    // TODO: Verify webhook signature using GITHUB_WEBHOOK_SECRET for production

    try {
      const parsed: unknown = JSON.parse(body);
      if (!isRecord(parsed)) {
        return webhookJson({ error: "Invalid webhook payload" }, 400);
      }
      const payload = parsed;

      if (eventType === "installation") {
        const result = await handleInstallationWebhook(ctx, payload);
        if (result) {
          return result;
        }
      }

      if (eventType === "release") {
        return await handleReleaseWebhook(ctx, payload);
      }

      if (eventType === "issues") {
        return await handleIssueWebhook(ctx, payload);
      }

      return webhookJson({ success: true, event: eventType });
    } catch (error) {
      console.error("GitHub webhook error:", error);
      return webhookJson(
        {
          error: "Failed to process webhook",
          message: error instanceof Error ? error.message : "Unknown error",
        },
        500
      );
    }
  }),
});

// ============================================
// FEEDBACK PUBLIC API (v1)
// ============================================

// CORS preflight handler for all API routes
http.route({
  path: "/api/v1/feedback",
  method: "OPTIONS",
  handler: httpAction(async () => corsPreflightResponse()),
});

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
        internal.feedback_api.getOrganizationConfig,
        {
          organizationId,
        }
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
        internal.feedback_api.listFeedbackByOrganization,
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

// OPTIONS for /api/v1/feedback/list
http.route({
  path: "/api/v1/feedback/list",
  method: "OPTIONS",
  handler: httpAction(async () => corsPreflightResponse()),
});

// GET /api/v1/feedback/item/:id - Get single feedback item
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
        internal.feedback_api.getFeedbackByOrganization,
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

// OPTIONS for /api/v1/feedback/item
http.route({
  path: "/api/v1/feedback/item",
  method: "OPTIONS",
  handler: httpAction(async () => corsPreflightResponse()),
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
        internal.feedback_api.createFeedbackByOrganization,
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

// OPTIONS for /api/v1/feedback/create
http.route({
  path: "/api/v1/feedback/create",
  method: "OPTIONS",
  handler: httpAction(async () => corsPreflightResponse()),
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
        internal.feedback_api.voteFeedbackByOrganization,
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

// OPTIONS for /api/v1/feedback/vote
http.route({
  path: "/api/v1/feedback/vote",
  method: "OPTIONS",
  handler: httpAction(async () => corsPreflightResponse()),
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
      internal.feedback_api.listCommentsByOrganization,
      {
        organizationId,
        feedbackId,
        sortBy: sortBy ?? undefined,
      }
    );

    return jsonResponse(result);
  }),
});

// OPTIONS for /api/v1/feedback/comments
http.route({
  path: "/api/v1/feedback/comments",
  method: "OPTIONS",
  handler: httpAction(async () => corsPreflightResponse()),
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
        internal.feedback_api.addCommentByOrganization,
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

// OPTIONS for /api/v1/feedback/comment
http.route({
  path: "/api/v1/feedback/comment",
  method: "OPTIONS",
  handler: httpAction(async () => corsPreflightResponse()),
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
        internal.feedback_api.subscribeFeedbackByOrganization,
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

// OPTIONS for /api/v1/feedback/subscribe
http.route({
  path: "/api/v1/feedback/subscribe",
  method: "OPTIONS",
  handler: httpAction(async () => corsPreflightResponse()),
});

// DELETE /api/v1/feedback/subscribe - Unsubscribe from feedback updates
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
        internal.feedback_api.unsubscribeFeedbackByOrganization,
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

// OPTIONS for /api/v1/feedback/unsubscribe
http.route({
  path: "/api/v1/feedback/unsubscribe",
  method: "OPTIONS",
  handler: httpAction(async () => corsPreflightResponse()),
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
      internal.feedback_api.getRoadmapByOrganization,
      {
        organizationId,
      }
    );

    if (!result) {
      return errorResponse("Roadmap not found", 404);
    }

    return jsonResponse(result);
  }),
});

// OPTIONS for /api/v1/feedback/roadmap
http.route({
  path: "/api/v1/feedback/roadmap",
  method: "OPTIONS",
  handler: httpAction(async () => corsPreflightResponse()),
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
      internal.feedback_api.getChangelogByOrganization,
      {
        organizationId,
        limit: limit ? Number.parseInt(limit, 10) : undefined,
      }
    );

    return jsonResponse(result);
  }),
});

// OPTIONS for /api/v1/feedback/changelog
http.route({
  path: "/api/v1/feedback/changelog",
  method: "OPTIONS",
  handler: httpAction(async () => corsPreflightResponse()),
});

// ============================================
// RSS FEED
// ============================================

// GET /rss/:orgSlug - Get RSS feed for organization changelog
http.route({
  path: "/rss",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const url = new URL(request.url);
    // Extract slug from path (e.g., /rss/my-org -> my-org)
    const pathParts = url.pathname.split("/").filter(Boolean);
    const orgSlug = pathParts[1];

    if (!orgSlug) {
      return new Response("Organization slug required", { status: 400 });
    }

    // Get organization by slug
    const org = await ctx.runQuery(internal.rss.getOrganizationBySlug, {
      slug: orgSlug,
    });

    if (!org) {
      return new Response("Organization not found", { status: 404 });
    }

    // Check if organization is public
    if (!org.isPublic) {
      return new Response("RSS feed not available for private organizations", {
        status: 404,
      });
    }

    // Get published releases
    const releases = await ctx.runQuery(internal.rss.getPublishedReleases, {
      organizationId: org._id,
      limit: 50,
    });

    const siteUrl = process.env.SITE_URL ?? "";
    const rssXml = generateRssFeed(org, releases, siteUrl);

    return new Response(rssXml, {
      status: 200,
      headers: {
        "Content-Type": "application/rss+xml; charset=utf-8",
        "Cache-Control": "public, max-age=3600",
      },
    });
  }),
});

export default http;
