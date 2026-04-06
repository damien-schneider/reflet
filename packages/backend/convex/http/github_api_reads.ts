import { api } from "../_generated/api";
import { httpAction } from "../_generated/server";
import { requireSession, toOrgId } from "./github_api_helpers";
import { jsonResponse } from "./helpers";

// ============================================
// GET ROUTE HANDLERS
// ============================================

/**
 * GET /api/github/repositories
 * Fetch repositories from GitHub installation
 */
export const handleGetRepositories = httpAction(async (ctx, request) => {
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
      api.integrations.github.connection_actions.getConnectionFromApiRoute,
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
      api.integrations.github.fetch_actions.fetchRepositories,
      { installationToken: tokenResult.token }
    );

    return new Response(JSON.stringify({ repositories }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store, no-cache, must-revalidate",
        Pragma: "no-cache",
        Expires: "0",
      },
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
export const handleGetLabels = httpAction(async (ctx, request) => {
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
      api.integrations.github.connection_actions.getConnectionFromApiRoute,
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
      api.integrations.github.fetch_actions.fetchLabels,
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
