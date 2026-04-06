import type { httpRouter } from "convex/server";
import { api } from "../_generated/api";
import { httpAction } from "../_generated/server";
import {
  generateWebhookSecret,
  parseGitHubError,
  requireSession,
  toOrgId,
} from "./github_api_helpers";
import { handleGetLabels, handleGetRepositories } from "./github_api_reads";
import { corsOptionsHandler, jsonResponse, parseJsonBody } from "./helpers";

type Router = ReturnType<typeof httpRouter>;

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
      api.integrations.github.connection_actions.getConnectionFromApiRoute,
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
      api.integrations.github.issue_mutations.updateIssuesSyncStatus,
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
        api.integrations.github.fetch_actions.fetchIssues,
        {
          installationToken: tokenResult.token,
          repositoryFullName: connection.repositoryFullName,
          state: state ?? "all",
          labels,
        }
      );

      await ctx.runMutation(
        api.integrations.github.issue_mutations.saveSyncedIssues,
        {
          organizationId,
          issues,
        }
      );

      const importResult = await ctx.runMutation(
        api.integrations.github.issue_imports.autoImportIssuesByLabel,
        { organizationId }
      );

      return jsonResponse({
        success: true,
        synced: issues.length,
        imported: importResult.imported,
      });
    } catch (error) {
      await ctx.runMutation(
        api.integrations.github.issue_mutations.updateIssuesSyncStatus,
        {
          connectionId: connection._id,
          status: "error",
          error: error instanceof Error ? error.message : "Unknown error",
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
      api.integrations.github.connection_actions.getConnectionFromApiRoute,
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
      api.integrations.github.connection_mutations.updateSyncStatus,
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

      const releases = await ctx.runAction(
        api.integrations.github.fetch_actions.fetchReleases,
        {
          installationToken: tokenResult.token,
          repositoryFullName: connection.repositoryFullName,
        }
      );

      await ctx.runMutation(
        api.integrations.github.sync_mutations.saveSyncedReleases,
        { organizationId, releases }
      );

      return jsonResponse({
        success: true,
        synced: releases.length,
      });
    } catch (error) {
      await ctx.runMutation(
        api.integrations.github.connection_mutations.updateSyncStatus,
        {
          connectionId: connection._id,
          status: "error",
          error: error instanceof Error ? error.message : "Unknown error",
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
        api.integrations.github.connection_actions.createWebhook,
        {
          installationToken: tokenResult.token,
          repositoryFullName: connection.repositoryFullName,
          webhookUrl,
          secret: webhookSecret,
        }
      );

      await ctx.runMutation(
        api.integrations.github.connection_mutations.updateWebhook,
        {
          organizationId,
          webhookId: webhookResult.webhookId,
          webhookSecret,
        }
      );

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
          api.integrations.github.connection_actions.generateWorkflowContent,
          {
            organizationSlug: org.slug,
            webhookUrl,
            branch,
          }
        );

        await ctx.runAction(
          api.integrations.github.node_actions.createOrUpdateFile,
          {
            installationToken: tokenResult.token,
            repositoryFullName: connection.repositoryFullName,
            path: ".github/workflows/reflet-release-sync.yml",
            content: workflowContent,
            message: "Add Reflet release sync workflow",
            branch,
          }
        );

        await ctx.runMutation(
          api.integrations.github.connection_mutations.updateCiSettings,
          {
            organizationId,
            ciEnabled: true,
            ciBranch: branch,
            ciWorkflowCreated: true,
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

    return jsonResponse({ error: errName, code, message }, status);
  }
});

const GITHUB_API_PATHS = [
  "/api/github/repositories",
  "/api/github/labels",
  "/api/github/issues",
  "/api/github/sync",
  "/api/github/setup",
] as const;

export function registerGithubApiRoutes(http: Router): void {
  http.route({
    path: "/api/github/repositories",
    method: "GET",
    handler: handleGetRepositories,
  });
  http.route({
    path: "/api/github/labels",
    method: "GET",
    handler: handleGetLabels,
  });
  http.route({
    path: "/api/github/issues",
    method: "POST",
    handler: handlePostIssues,
  });
  http.route({
    path: "/api/github/sync",
    method: "POST",
    handler: handlePostSync,
  });
  http.route({
    path: "/api/github/setup",
    method: "POST",
    handler: handlePostSetup,
  });

  for (const path of GITHUB_API_PATHS) {
    http.route({ path, method: "OPTIONS", handler: corsOptionsHandler() });
  }
}
