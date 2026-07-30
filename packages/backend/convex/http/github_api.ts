import type { httpRouter } from "convex/server";
import { api } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import { httpAction } from "../_generated/server";
import { createAuth } from "../auth/auth";
import { corsOptionsHandler, jsonResponse, parseJsonBody } from "./helpers";

type Router = ReturnType<typeof httpRouter>;

// ============================================
// TYPES
// ============================================

type ActionCtx = Parameters<Parameters<typeof httpAction>[0]>[0];

// ============================================
// AUTH HELPER
// ============================================

async function requireSession(
  ctx: ActionCtx,
  request: Request
): Promise<
  | { success: true; session: { user: { id: string } } }
  | { success: false; response: Response }
> {
  const auth = createAuth(ctx);
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) {
    return {
      response: jsonResponse({ error: "Authentication required" }, 401),
      success: false,
    };
  }
  return { session, success: true };
}

// ============================================
// HELPERS
// ============================================

function toOrgId(value: string): Id<"organizations"> {
  return value as Id<"organizations">;
}

function generateWebhookSecret(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function parseGitHubError(errorMessage: string): {
  error: string;
  code: string;
  message: string;
  status: number;
} {
  if (
    errorMessage.includes("403") ||
    errorMessage.toLowerCase().includes("forbidden")
  ) {
    return {
      code: "GITHUB_PERMISSION_DENIED",
      error: "Permission denied",
      message:
        "The GitHub App is missing the required webhook permissions. Please update the app permissions in GitHub settings.",
      status: 403,
    };
  }

  if (
    errorMessage.includes("404") ||
    errorMessage.toLowerCase().includes("not found")
  ) {
    return {
      code: "GITHUB_REPO_NOT_FOUND",
      error: "Repository not found",
      message:
        "The repository could not be found. Please ensure the GitHub App has access to this repository.",
      status: 404,
    };
  }

  if (
    errorMessage.includes("localhost") ||
    errorMessage.includes("not reachable over the public Internet")
  ) {
    return {
      code: "LOCALHOST_NOT_SUPPORTED",
      error: "Localhost not supported",
      message:
        "GitHub webhooks require a publicly accessible URL. Use a tunneling service (ngrok, cloudflared) for local development, or test in a deployed environment.",
      status: 400,
    };
  }

  if (
    errorMessage.includes("422") ||
    errorMessage.includes("url is missing a scheme") ||
    errorMessage.includes("Validation Failed")
  ) {
    return {
      code: "INVALID_WEBHOOK_URL",
      error: "Server configuration error",
      message:
        "The webhook URL could not be configured. Please contact support.",
      status: 500,
    };
  }

  return {
    code: "GITHUB_SETUP_FAILED",
    error: "Failed to setup GitHub integration",
    message: errorMessage,
    status: 500,
  };
}

// ============================================
// ROUTE HANDLERS
// ============================================

/**
 * GET /api/github/repositories
 * Fetch repositories from GitHub installation
 */
const handleGetRepositories = httpAction(async (ctx, request) => {
  const authResult = await requireSession(ctx, request);
  if (!authResult.success) {
    return authResult.response;
  }

  const { searchParams } = new URL(request.url);
  const orgIdParam = searchParams.get("organizationId");

  if (!orgIdParam) {
    return jsonResponse({ error: "Organization ID is required" }, 400);
  }

  const organizationId = toOrgId(orgIdParam);

  try {
    const connection = await ctx.runAction(
      api.integrations.github.actions.getConnectionFromApiRoute,
      { organizationId }
    );

    if (!connection) {
      return jsonResponse({ error: "No GitHub connection found" }, 404);
    }

    const tokenResult = await ctx.runAction(
      api.integrations.github.node_actions.getInstallationToken,
      { installationId: connection.installationId }
    );

    const repositories = await ctx.runAction(
      api.integrations.github.actions.fetchRepositories,
      { installationToken: tokenResult.token }
    );

    return new Response(JSON.stringify({ repositories }), {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate",
        "Content-Type": "application/json",
        Expires: "0",
        Pragma: "no-cache",
      },
      status: 200,
    });
  } catch (error) {
    return jsonResponse(
      {
        error: "Failed to fetch repositories",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      500
    );
  }
});

/**
 * GET /api/github/labels
 * Fetch labels from GitHub repository
 */
const handleGetLabels = httpAction(async (ctx, request) => {
  const authResult = await requireSession(ctx, request);
  if (!authResult.success) {
    return authResult.response;
  }

  const { searchParams } = new URL(request.url);
  const orgIdParam = searchParams.get("organizationId");

  if (!orgIdParam) {
    return jsonResponse({ error: "Organization ID is required" }, 400);
  }

  const organizationId = toOrgId(orgIdParam);

  try {
    const connection = await ctx.runAction(
      api.integrations.github.actions.getConnectionFromApiRoute,
      { organizationId }
    );

    if (!connection) {
      return jsonResponse({ error: "No GitHub connection found" }, 404);
    }

    if (!connection.repositoryFullName) {
      return jsonResponse({ error: "No repository connected" }, 400);
    }

    const tokenResult = await ctx.runAction(
      api.integrations.github.node_actions.getInstallationToken,
      { installationId: connection.installationId }
    );

    const labels = await ctx.runAction(
      api.integrations.github.actions.fetchLabels,
      {
        installationToken: tokenResult.token,
        repositoryFullName: connection.repositoryFullName,
      }
    );

    return jsonResponse({ labels });
  } catch (error) {
    return jsonResponse(
      {
        error: "Failed to fetch labels",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      500
    );
  }
});

/**
 * POST /api/github/issues
 * Sync issues from GitHub
 */
const handlePostIssues = httpAction(async (ctx, request) => {
  const authResult = await requireSession(ctx, request);
  if (!authResult.success) {
    return authResult.response;
  }

  try {
    const bodyResult = await parseJsonBody(request);
    if (!bodyResult.success) {
      return bodyResult.response;
    }
    const body = bodyResult.body;

    const orgIdParam =
      typeof body.organizationId === "string" ? body.organizationId : "";
    if (!orgIdParam) {
      return jsonResponse({ error: "Organization ID is required" }, 400);
    }

    const organizationId = toOrgId(orgIdParam);
    const state =
      typeof body.state === "string" &&
      ["open", "closed", "all"].includes(body.state)
        ? (body.state as "open" | "closed" | "all")
        : undefined;
    const labels = typeof body.labels === "string" ? body.labels : undefined;

    const connection = await ctx.runAction(
      api.integrations.github.actions.getConnectionFromApiRoute,
      { organizationId }
    );

    if (!connection) {
      return jsonResponse({ error: "No GitHub connection found" }, 404);
    }

    if (!connection.repositoryFullName) {
      return jsonResponse({ error: "No repository connected" }, 400);
    }

    // Update sync status to syncing
    await ctx.runMutation(
      api.integrations.github.issues.updateIssuesSyncStatus,
      {
        connectionId: connection._id,
        status: "syncing",
      }
    );

    try {
      const tokenResult = await ctx.runAction(
        api.integrations.github.node_actions.getInstallationToken,
        { installationId: connection.installationId }
      );

      const issues = await ctx.runAction(
        api.integrations.github.actions.fetchIssues,
        {
          installationToken: tokenResult.token,
          labels,
          repositoryFullName: connection.repositoryFullName,
          state: state ?? "all",
        }
      );

      await ctx.runMutation(api.integrations.github.issues.saveSyncedIssues, {
        issues,
        organizationId,
      });

      const importResult = await ctx.runMutation(
        api.integrations.github.issues.autoImportIssuesByLabel,
        { organizationId }
      );

      return jsonResponse({
        imported: importResult.imported,
        success: true,
        synced: issues.length,
      });
    } catch (error) {
      await ctx.runMutation(
        api.integrations.github.issues.updateIssuesSyncStatus,
        {
          connectionId: connection._id,
          error: error instanceof Error ? error.message : "Unknown error",
          status: "error",
        }
      );
      throw error;
    }
  } catch (error) {
    return jsonResponse(
      {
        error: "Failed to sync issues",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      500
    );
  }
});

/**
 * POST /api/github/sync
 * Sync releases from GitHub
 */
const handlePostSync = httpAction(async (ctx, request) => {
  const authResult = await requireSession(ctx, request);
  if (!authResult.success) {
    return authResult.response;
  }

  try {
    const bodyResult = await parseJsonBody(request);
    if (!bodyResult.success) {
      return bodyResult.response;
    }
    const body = bodyResult.body;

    const orgIdParam =
      typeof body.organizationId === "string" ? body.organizationId : "";
    if (!orgIdParam) {
      return jsonResponse({ error: "Organization ID is required" }, 400);
    }

    const organizationId = toOrgId(orgIdParam);

    const connection = await ctx.runAction(
      api.integrations.github.actions.getConnectionFromApiRoute,
      { organizationId }
    );

    if (!connection) {
      return jsonResponse({ error: "No GitHub connection found" }, 404);
    }

    if (!connection.repositoryFullName) {
      return jsonResponse({ error: "No repository connected" }, 400);
    }

    // Update sync status to syncing
    await ctx.runMutation(api.integrations.github.mutations.updateSyncStatus, {
      connectionId: connection._id,
      status: "syncing",
    });

    try {
      const tokenResult = await ctx.runAction(
        api.integrations.github.node_actions.getInstallationToken,
        { installationId: connection.installationId }
      );

      const releases = await ctx.runAction(
        api.integrations.github.actions.fetchReleases,
        {
          installationToken: tokenResult.token,
          repositoryFullName: connection.repositoryFullName,
        }
      );

      await ctx.runMutation(
        api.integrations.github.mutations.saveSyncedReleases,
        { organizationId, releases }
      );

      return jsonResponse({
        success: true,
        synced: releases.length,
      });
    } catch (error) {
      await ctx.runMutation(
        api.integrations.github.mutations.updateSyncStatus,
        {
          connectionId: connection._id,
          error: error instanceof Error ? error.message : "Unknown error",
          status: "error",
        }
      );
      throw error;
    }
  } catch (error) {
    return jsonResponse(
      {
        error: "Failed to sync releases",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      500
    );
  }
});

/**
 * POST /api/github/setup
 * One-click setup for CI/webhook
 */
const handlePostSetup = httpAction(async (ctx, request) => {
  const authResult = await requireSession(ctx, request);
  if (!authResult.success) {
    return authResult.response;
  }

  try {
    const bodyResult = await parseJsonBody(request);
    if (!bodyResult.success) {
      return bodyResult.response;
    }
    const body = bodyResult.body;

    const orgIdParam =
      typeof body.organizationId === "string" ? body.organizationId : "";
    if (!orgIdParam) {
      return jsonResponse({ error: "Organization ID is required" }, 400);
    }

    const organizationId = toOrgId(orgIdParam);
    const setupWebhook =
      typeof body.setupWebhook === "boolean" ? body.setupWebhook : true;
    const setupCi = typeof body.setupCi === "boolean" ? body.setupCi : false;
    const ciBranch =
      typeof body.ciBranch === "string" ? body.ciBranch : undefined;

    const connection = await ctx.runAction(
      api.integrations.github.actions.getConnectionFromApiRoute,
      { organizationId }
    );

    if (!connection) {
      return jsonResponse({ error: "No GitHub connection found" }, 404);
    }

    if (!connection.repositoryFullName) {
      return jsonResponse({ error: "No repository connected" }, 400);
    }

    const tokenResult = await ctx.runAction(
      api.integrations.github.node_actions.getInstallationToken,
      { installationId: connection.installationId }
    );

    // Derive the Convex site URL from the current request
    const requestUrl = new URL(request.url);
    const convexSiteUrl = `${requestUrl.protocol}//${requestUrl.host}`;

    const results: {
      webhook?: { id: string };
      ci?: { created: boolean };
    } = {};

    // Setup webhook if requested
    if (setupWebhook && !connection.webhookId) {
      const webhookSecret = generateWebhookSecret();
      const webhookUrl = `${convexSiteUrl}/github-webhook`;

      const webhookResult = await ctx.runAction(
        api.integrations.github.actions.createWebhook,
        {
          installationToken: tokenResult.token,
          repositoryFullName: connection.repositoryFullName,
          secret: webhookSecret,
          webhookUrl,
        }
      );

      await ctx.runMutation(api.integrations.github.mutations.updateWebhook, {
        organizationId,
        webhookId: webhookResult.webhookId,
        webhookSecret,
      });

      results.webhook = { id: webhookResult.webhookId };
    }

    // Setup CI if requested
    if (setupCi) {
      const branch = ciBranch || connection.repositoryDefaultBranch || "main";

      const org = await ctx.runQuery(api.organizations.queries.get, {
        id: organizationId,
      });

      if (org) {
        const webhookUrl = `${convexSiteUrl}/github-webhook`;

        const workflowContent = await ctx.runAction(
          api.integrations.github.actions.generateWorkflowContent,
          {
            branch,
            organizationSlug: org.slug,
            webhookUrl,
          }
        );

        await ctx.runAction(
          api.integrations.github.node_actions.createOrUpdateFile,
          {
            branch,
            content: workflowContent,
            installationToken: tokenResult.token,
            message: "Add Reflet release sync workflow",
            path: ".github/workflows/reflet-release-sync.yml",
            repositoryFullName: connection.repositoryFullName,
          }
        );

        await ctx.runMutation(
          api.integrations.github.mutations.updateCiSettings,
          {
            ciBranch: branch,
            ciEnabled: true,
            ciWorkflowCreated: true,
            organizationId,
          }
        );

        results.ci = { created: true };
      }
    }

    return jsonResponse({ success: true, ...results });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    const {
      error: errName,
      code,
      message,
      status,
    } = parseGitHubError(errorMessage);

    return jsonResponse({ code, error: errName, message }, status);
  }
});

// ============================================
// ROUTE REGISTRATION
// ============================================

const GITHUB_API_PATHS = [
  "/api/github/repositories",
  "/api/github/labels",
  "/api/github/issues",
  "/api/github/sync",
  "/api/github/setup",
] as const;

export function registerGithubApiRoutes(http: Router): void {
  // GET routes
  http.route({
    handler: handleGetRepositories,
    method: "GET",
    path: "/api/github/repositories",
  });

  http.route({
    handler: handleGetLabels,
    method: "GET",
    path: "/api/github/labels",
  });

  // POST routes
  http.route({
    handler: handlePostIssues,
    method: "POST",
    path: "/api/github/issues",
  });

  http.route({
    handler: handlePostSync,
    method: "POST",
    path: "/api/github/sync",
  });

  http.route({
    handler: handlePostSetup,
    method: "POST",
    path: "/api/github/setup",
  });

  // CORS preflight handlers
  for (const path of GITHUB_API_PATHS) {
    http.route({ handler: corsOptionsHandler(), method: "OPTIONS", path });
  }
}
