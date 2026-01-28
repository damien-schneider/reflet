import { api } from "@reflet-v2/backend/convex/_generated/api";
import type { Id } from "@reflet-v2/backend/convex/_generated/dataModel";
import { fetchAction, fetchMutation, fetchQuery } from "convex/nextjs";
import { NextResponse } from "next/server";

/**
 * Generate a random webhook secret
 */
function generateWebhookSecret(): string {
  const crypto = require("node:crypto");
  return crypto.randomBytes(32).toString("hex");
}

/**
 * Parse error message and return appropriate error response
 */
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
      error: "Permission denied",
      code: "GITHUB_PERMISSION_DENIED",
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
      error: "Repository not found",
      code: "GITHUB_REPO_NOT_FOUND",
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
      error: "Localhost not supported",
      code: "LOCALHOST_NOT_SUPPORTED",
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
      error: "Server configuration error",
      code: "INVALID_WEBHOOK_URL",
      message:
        "The webhook URL could not be configured. Please contact support.",
      status: 500,
    };
  }

  return {
    error: "Failed to setup GitHub integration",
    code: "GITHUB_SETUP_FAILED",
    message: errorMessage,
    status: 500,
  };
}

/**
 * One-click setup for CI/webhook
 * - Creates webhook on GitHub repo
 * - Optionally creates GitHub Action workflow
 */
export async function POST(request: Request): Promise<NextResponse> {
  try {
    const body = (await request.json()) as {
      organizationId: string;
      setupWebhook?: boolean;
      setupCi?: boolean;
      ciBranch?: string;
    };

    const {
      organizationId: orgId,
      setupWebhook = true,
      setupCi = false,
      ciBranch,
    } = body;

    const organizationId = orgId as Id<"organizations">;

    if (!organizationId) {
      return NextResponse.json(
        { error: "Organization ID is required" },
        { status: 400 }
      );
    }

    // Get the GitHub connection using action (no auth required)
    const connection = await fetchAction(
      api.github_actions.getConnectionFromApiRoute,
      { organizationId }
    );

    if (!connection) {
      return NextResponse.json(
        { error: "No GitHub connection found" },
        { status: 404 }
      );
    }

    if (!connection.repositoryFullName) {
      return NextResponse.json(
        { error: "No repository connected" },
        { status: 400 }
      );
    }

    // Get installation access token
    const tokenResult = await fetchAction(
      api.github_node_actions.getInstallationToken,
      {
        installationId: connection.installationId,
      }
    );

    const results: {
      webhook?: { id: string };
      ci?: { created: boolean };
    } = {};

    // Setup webhook if requested
    if (setupWebhook && !connection.webhookId) {
      const siteUrl = process.env.SITE_URL;

      // Validate SITE_URL is configured with a proper scheme
      if (!siteUrl?.startsWith("http")) {
        return NextResponse.json(
          {
            error: "Server configuration error",
            code: "MISSING_SITE_URL",
            message:
              "The webhook URL could not be configured. Please contact support.",
          },
          { status: 500 }
        );
      }

      const webhookSecret = generateWebhookSecret();
      const webhookUrl = `${siteUrl}/api/github/webhook`;

      const webhookResult = await fetchAction(
        api.github_actions.createWebhook,
        {
          installationToken: tokenResult.token,
          repositoryFullName: connection.repositoryFullName,
          webhookUrl,
          secret: webhookSecret,
        }
      );

      // Save webhook info
      await fetchMutation(api.github.updateWebhook, {
        organizationId,
        webhookId: webhookResult.webhookId,
        webhookSecret,
      });

      results.webhook = { id: webhookResult.webhookId };
    }

    // Setup CI if requested
    if (setupCi) {
      const branch = ciBranch || connection.repositoryDefaultBranch || "main";

      // Get the organization for the webhook URL
      const org = await fetchQuery(api.organizations.get, {
        id: organizationId,
      });

      if (org) {
        const webhookUrl = `${process.env.SITE_URL}/api/github/webhook`;

        // Generate workflow content
        const workflowContent = await fetchAction(
          api.github_actions.generateWorkflowContent,
          {
            organizationSlug: org.slug,
            webhookUrl,
            branch,
          }
        );

        // Create or update the workflow file
        await fetchAction(api.github_node_actions.createOrUpdateFile, {
          installationToken: tokenResult.token,
          repositoryFullName: connection.repositoryFullName,
          path: ".github/workflows/reflet-release-sync.yml",
          content: workflowContent,
          message: "Add Reflet release sync workflow",
          branch,
        });

        // Update CI settings
        await fetchMutation(api.github.updateCiSettings, {
          organizationId,
          ciEnabled: true,
          ciBranch: branch,
          ciWorkflowCreated: true,
        });

        results.ci = { created: true };
      }
    }

    return NextResponse.json({
      success: true,
      ...results,
    });
  } catch (error) {
    console.error("Error setting up GitHub integration:", error);

    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    const {
      error: errName,
      code,
      message,
      status,
    } = parseGitHubError(errorMessage);

    return NextResponse.json({ error: errName, code, message }, { status });
  }
}
