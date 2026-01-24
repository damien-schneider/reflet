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

    // Get the GitHub connection
    const connection = await fetchQuery(api.github.getConnection, {
      organizationId,
    });

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
      api.github_actions.getInstallationToken,
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
      const webhookSecret = generateWebhookSecret();
      const webhookUrl = `${process.env.SITE_URL}/api/github/webhook`;

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
        await fetchAction(api.github_actions.createOrUpdateFile, {
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
    return NextResponse.json(
      {
        error: "Failed to setup GitHub integration",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
