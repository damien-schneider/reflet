import { httpRouter } from "convex/server";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { httpAction } from "./_generated/server";
import { authComponent, createAuth } from "./auth";
import { decodeUserToken } from "./feedback_api_auth";
import { polar } from "./polar";

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
  boardId?: Id<"boards">;
  organizationId?: Id<"organizations">;
  apiKeyId?: Id<"boardApiKeys">;
  organizationApiKeyId?: Id<"organizationApiKeys">;
  isSecretKey: boolean;
  externalUserId?: Id<"externalUsers">;
}

/**
 * Check if a board is accessible (public or using secret key)
 */
async function checkBoardAccess(
  ctx: Parameters<Parameters<typeof httpAction>[0]>[0],
  boardId: Id<"boards">,
  isSecretKey: boolean
): Promise<{ allowed: true } | { allowed: false; response: Response }> {
  const board = await ctx.runQuery(internal.feedback_api.getBoardConfig, {
    boardId,
  });

  if (!board) {
    return { allowed: false, response: errorResponse("Board not found", 404) };
  }

  if (!(board.isPublic || isSecretKey)) {
    return {
      allowed: false,
      response: errorResponse(
        "This board is not public. Use a secret key for private board access.",
        403
      ),
    };
  }

  return { allowed: true };
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

  // Check for either board-level or organization-level auth
  const hasBoardAuth =
    validation.success && validation.boardId && validation.apiKeyId;
  const hasOrgAuth =
    validation.success &&
    validation.organizationId &&
    validation.organizationApiKeyId;

  if (!(hasBoardAuth || hasOrgAuth)) {
    return {
      success: false,
      response: errorResponse(validation.error ?? "Invalid API key", 401),
    };
  }

  // Update last used timestamp (fire and forget)
  if (validation.apiKeyId) {
    ctx.runMutation(internal.feedback_api_auth.updateApiKeyLastUsed, {
      apiKeyId: validation.apiKeyId,
    });
  }
  if (validation.organizationApiKeyId) {
    ctx.runMutation(
      internal.feedback_api_auth.updateOrganizationApiKeyLastUsed,
      {
        apiKeyId: validation.organizationApiKeyId,
      }
    );
  }

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
          boardId: validation.boardId,
          organizationId: validation.organizationId,
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
      boardId: validation.boardId,
      organizationId: validation.organizationId,
      apiKeyId: validation.apiKeyId,
      organizationApiKeyId: validation.organizationApiKeyId,
      isSecretKey: validation.isSecretKey ?? false,
      externalUserId,
    },
  };
}

// Register Better Auth routes
authComponent.registerRoutes(http, createAuth);

// ============================================
// POLAR WEBHOOK HANDLER
// ============================================

// Register Polar webhook routes at /polar/events
// The component handles webhook signature verification and subscription sync
polar.registerRoutes(http);

// ============================================
// GITHUB WEBHOOK HANDLER
// ============================================

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
      const payload = JSON.parse(body) as Record<string, unknown>;

      // Handle installation events (app installed/uninstalled)
      if (eventType === "installation") {
        const action = payload.action as string;
        const installation = payload.installation as {
          id: number;
          account: { login: string };
        };

        if (action === "deleted") {
          // App was uninstalled - remove the connection
          await ctx.runMutation(internal.github.handleInstallationDeleted, {
            installationId: String(installation.id),
          });
          return new Response(
            JSON.stringify({ success: true, action: "installation_deleted" }),
            {
              status: 200,
              headers: { "Content-Type": "application/json" },
            }
          );
        }
      }

      // Handle release events (placeholder for future implementation)
      if (eventType === "release") {
        const release = payload.release as { tag_name: string };
        return new Response(
          JSON.stringify({
            success: true,
            action: "release_event_received",
            release: release.tag_name,
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      // Acknowledge other events
      return new Response(JSON.stringify({ success: true, event: eventType }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      console.error("GitHub webhook error:", error);
      return new Response(
        JSON.stringify({
          error: "Failed to process webhook",
          message: error instanceof Error ? error.message : "Unknown error",
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
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

// GET /api/v1/feedback - Get config (supports both board and organization)
http.route({
  path: "/api/v1/feedback",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    try {
      const authResult = await authenticateApiRequest(ctx, request);
      if (!authResult.success) {
        return authResult.response;
      }

      const { boardId, organizationId, isSecretKey } = authResult.auth;

      // New flow: organization-level API key
      if (organizationId) {
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
      }

      // Legacy flow: board-level API key
      if (!boardId) {
        return errorResponse("Invalid API key configuration", 500);
      }

      const config = await ctx.runQuery(internal.feedback_api.getBoardConfig, {
        boardId,
      });

      if (!config) {
        return errorResponse("Board not found", 404);
      }

      // Check if board is public (API access requires public board or secret key)
      if (!(config.isPublic || isSecretKey)) {
        return errorResponse(
          "This board is not public. Use a secret key for private board access.",
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
  // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: HTTP handler with extensive query param validation
  handler: httpAction(async (ctx, request) => {
    try {
      const authResult = await authenticateApiRequest(ctx, request);
      if (!authResult.success) {
        return authResult.response;
      }

      const { boardId, organizationId, externalUserId, isSecretKey } =
        authResult.auth;

      const url = new URL(request.url);
      const statusId = url.searchParams.get("statusId");
      const status = url.searchParams.get("status") as
        | "open"
        | "under_review"
        | "planned"
        | "in_progress"
        | "completed"
        | "closed"
        | null;
      const search = url.searchParams.get("search");
      const sortBy = url.searchParams.get("sortBy") as
        | "votes"
        | "newest"
        | "oldest"
        | "comments"
        | null;
      const limit = url.searchParams.get("limit");
      const offset = url.searchParams.get("offset");

      // New flow: organization-level API key
      if (organizationId) {
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
            statusId:
              (statusId as Id<"organizationStatuses"> | undefined) ?? undefined,
            status: status ?? undefined,
            search: search ?? undefined,
            sortBy: sortBy ?? undefined,
            limit: limit ? Number.parseInt(limit, 10) : undefined,
            offset: offset ? Number.parseInt(offset, 10) : undefined,
            externalUserId,
          }
        );

        return jsonResponse(result);
      }

      // Legacy flow: board-level API key
      if (!boardId) {
        return errorResponse("Invalid API key configuration", 500);
      }

      // Check board visibility
      const access = await checkBoardAccess(ctx, boardId, isSecretKey);
      if (!access.allowed) {
        return access.response;
      }

      const result = await ctx.runQuery(internal.feedback_api.listFeedback, {
        boardId,
        statusId: (statusId as Id<"boardStatuses"> | undefined) ?? undefined,
        status: status ?? undefined,
        search: search ?? undefined,
        sortBy: sortBy ?? undefined,
        limit: limit ? Number.parseInt(limit, 10) : undefined,
        offset: offset ? Number.parseInt(offset, 10) : undefined,
        externalUserId,
      });

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

      const { boardId, organizationId, externalUserId, isSecretKey } =
        authResult.auth;

      const url = new URL(request.url);
      const feedbackId = url.searchParams.get("id") as Id<"feedback"> | null;

      if (!feedbackId) {
        return errorResponse("Missing feedback ID", 400);
      }

      // New flow: organization-level API key
      if (organizationId) {
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
      }

      // Legacy flow: board-level API key
      if (!boardId) {
        return errorResponse("Invalid API key configuration", 500);
      }

      // Check board visibility
      const access = await checkBoardAccess(ctx, boardId, isSecretKey);
      if (!access.allowed) {
        return access.response;
      }

      const result = await ctx.runQuery(internal.feedback_api.getFeedback, {
        boardId,
        feedbackId,
        externalUserId,
      });

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

      const { boardId, organizationId, externalUserId, isSecretKey } =
        authResult.auth;

      if (!externalUserId) {
        return errorResponse(
          "User identification required. Provide X-User-Token header.",
          401
        );
      }

      let body: { title?: string; description?: string; tagId?: string };
      try {
        body = (await request.json()) as {
          title?: string;
          description?: string;
          tagId?: string;
        };
      } catch {
        return errorResponse("Invalid JSON body", 400);
      }
      const { title, description, tagId } = body;

      if (!(title && description)) {
        return errorResponse("Title and description are required", 400);
      }

      // New flow: organization-level API key
      if (organizationId) {
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
            tagId: tagId as Id<"tags"> | undefined,
            externalUserId,
          }
        );

        return jsonResponse(result, 201);
      }

      // Legacy flow: board-level API key
      if (!boardId) {
        return errorResponse("Invalid API key configuration", 500);
      }

      // Check board visibility
      const access = await checkBoardAccess(ctx, boardId, isSecretKey);
      if (!access.allowed) {
        return access.response;
      }

      const result = await ctx.runMutation(
        internal.feedback_api.createFeedback,
        {
          boardId,
          title,
          description,
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

      const { boardId, organizationId, externalUserId, isSecretKey } =
        authResult.auth;

      if (!externalUserId) {
        return errorResponse(
          "User identification required. Provide X-User-Token header.",
          401
        );
      }

      let body: { feedbackId?: string; voteType?: "upvote" | "downvote" };
      try {
        body = (await request.json()) as typeof body;
      } catch {
        return errorResponse("Invalid JSON body", 400);
      }
      const { feedbackId, voteType } = body;

      if (!feedbackId) {
        return errorResponse("Feedback ID is required", 400);
      }

      // New flow: organization-level API key
      if (organizationId) {
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
            feedbackId: feedbackId as Id<"feedback">,
            externalUserId,
            voteType,
          }
        );

        return jsonResponse(result);
      }

      // Legacy flow: board-level API key
      if (!boardId) {
        return errorResponse("Invalid API key configuration", 500);
      }

      // Check board visibility
      const access = await checkBoardAccess(ctx, boardId, isSecretKey);
      if (!access.allowed) {
        return access.response;
      }

      const result = await ctx.runMutation(internal.feedback_api.voteFeedback, {
        boardId,
        feedbackId: feedbackId as Id<"feedback">,
        externalUserId,
        voteType,
      });

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

    const { boardId, organizationId } = authResult.auth;
    const url = new URL(request.url);
    const feedbackId = url.searchParams.get(
      "feedbackId"
    ) as Id<"feedback"> | null;
    const sortBy = url.searchParams.get("sortBy") as "newest" | "oldest" | null;

    if (!feedbackId) {
      return errorResponse("Feedback ID is required", 400);
    }

    // New flow: organization-level API key
    if (organizationId) {
      const result = await ctx.runQuery(
        internal.feedback_api.listCommentsByOrganization,
        {
          organizationId,
          feedbackId,
          sortBy: sortBy ?? undefined,
        }
      );

      return jsonResponse(result);
    }

    // Legacy flow: board-level API key
    if (!boardId) {
      return errorResponse("Invalid API key configuration", 500);
    }

    const result = await ctx.runQuery(internal.feedback_api.listComments, {
      boardId,
      feedbackId,
      sortBy: sortBy ?? undefined,
    });

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

    const { boardId, organizationId, externalUserId } = authResult.auth;

    if (!externalUserId) {
      return errorResponse(
        "User identification required. Provide X-User-Token header.",
        401
      );
    }

    const body = (await request.json()) as {
      feedbackId?: string;
      body?: string;
      parentId?: string;
    };

    if (!(body.feedbackId && body.body)) {
      return errorResponse("Feedback ID and comment body are required", 400);
    }

    try {
      // New flow: organization-level API key
      if (organizationId) {
        const result = await ctx.runMutation(
          internal.feedback_api.addCommentByOrganization,
          {
            organizationId,
            feedbackId: body.feedbackId as Id<"feedback">,
            body: body.body,
            parentId: body.parentId as Id<"comments"> | undefined,
            externalUserId,
          }
        );

        return jsonResponse(result, 201);
      }

      // Legacy flow: board-level API key
      if (!boardId) {
        return errorResponse("Invalid API key configuration", 500);
      }

      const result = await ctx.runMutation(internal.feedback_api.addComment, {
        boardId,
        feedbackId: body.feedbackId as Id<"feedback">,
        body: body.body,
        parentId: body.parentId as Id<"comments"> | undefined,
        externalUserId,
      });

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

    const { boardId, organizationId, externalUserId } = authResult.auth;

    if (!externalUserId) {
      return errorResponse(
        "User identification required. Provide X-User-Token header.",
        401
      );
    }

    const body = (await request.json()) as { feedbackId?: string };

    if (!body.feedbackId) {
      return errorResponse("Feedback ID is required", 400);
    }

    try {
      // New flow: organization-level API key
      if (organizationId) {
        const result = await ctx.runMutation(
          internal.feedback_api.subscribeFeedbackByOrganization,
          {
            organizationId,
            feedbackId: body.feedbackId as Id<"feedback">,
            externalUserId,
          }
        );

        return jsonResponse(result);
      }

      // Legacy flow: board-level API key
      if (!boardId) {
        return errorResponse("Invalid API key configuration", 500);
      }

      const result = await ctx.runMutation(
        internal.feedback_api.subscribeFeedback,
        {
          boardId,
          feedbackId: body.feedbackId as Id<"feedback">,
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

    const { boardId, organizationId, externalUserId } = authResult.auth;

    if (!externalUserId) {
      return errorResponse(
        "User identification required. Provide X-User-Token header.",
        401
      );
    }

    const body = (await request.json()) as { feedbackId?: string };

    if (!body.feedbackId) {
      return errorResponse("Feedback ID is required", 400);
    }

    try {
      // New flow: organization-level API key
      if (organizationId) {
        const result = await ctx.runMutation(
          internal.feedback_api.unsubscribeFeedbackByOrganization,
          {
            organizationId,
            feedbackId: body.feedbackId as Id<"feedback">,
            externalUserId,
          }
        );

        return jsonResponse(result);
      }

      // Legacy flow: board-level API key
      if (!boardId) {
        return errorResponse("Invalid API key configuration", 500);
      }

      const result = await ctx.runMutation(
        internal.feedback_api.unsubscribeFeedback,
        {
          boardId,
          feedbackId: body.feedbackId as Id<"feedback">,
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

    const { boardId, organizationId, externalUserId } = authResult.auth;

    // New flow: organization-level API key
    if (organizationId) {
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
    }

    // Legacy flow: board-level API key
    if (!boardId) {
      return errorResponse("Invalid API key configuration", 500);
    }

    const result = await ctx.runQuery(internal.feedback_api.getRoadmap, {
      boardId,
      externalUserId,
    });

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

    const { boardId, organizationId } = authResult.auth;
    const url = new URL(request.url);
    const limit = url.searchParams.get("limit");

    // New flow: organization-level API key
    if (organizationId) {
      const result = await ctx.runQuery(
        internal.feedback_api.getChangelogByOrganization,
        {
          organizationId,
          limit: limit ? Number.parseInt(limit, 10) : undefined,
        }
      );

      return jsonResponse(result);
    }

    // Legacy flow: board-level API key
    if (!boardId) {
      return errorResponse("Invalid API key configuration", 500);
    }

    const result = await ctx.runQuery(internal.feedback_api.getChangelog, {
      boardId,
      limit: limit ? Number.parseInt(limit, 10) : undefined,
    });

    return jsonResponse(result);
  }),
});

// OPTIONS for /api/v1/feedback/changelog
http.route({
  path: "/api/v1/feedback/changelog",
  method: "OPTIONS",
  handler: httpAction(async () => corsPreflightResponse()),
});

export default http;
