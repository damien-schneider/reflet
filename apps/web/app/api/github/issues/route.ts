import { api } from "@reflet/backend/convex/_generated/api";
import { fetchAction, fetchMutation } from "convex/nextjs";
import { NextResponse } from "next/server";
import { z } from "zod";
import { toOrgId } from "@/lib/convex-helpers";

/**
 * Sync issues from GitHub
 */
export async function POST(request: Request): Promise<NextResponse> {
  try {
    const issuesBodySchema = z.object({
      organizationId: z.string().min(1),
      state: z.enum(["open", "closed", "all"]).optional(),
      labels: z.string().optional(),
    });
    const body = issuesBodySchema.parse(await request.json());
    const organizationId = toOrgId(body.organizationId);

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

    // Update sync status to syncing
    await fetchMutation(api.github_issues.updateIssuesSyncStatus, {
      connectionId: connection._id,
      status: "syncing",
    });

    try {
      // Get installation access token
      const tokenResult = await fetchAction(
        api.github_node_actions.getInstallationToken,
        {
          installationId: connection.installationId,
        }
      );

      // Fetch issues from GitHub
      const issues = await fetchAction(api.github_actions.fetchIssues, {
        installationToken: tokenResult.token,
        repositoryFullName: connection.repositoryFullName,
        state: body.state ?? "all",
        labels: body.labels,
      });

      // Save synced issues
      await fetchMutation(api.github_issues.saveSyncedIssues, {
        organizationId,
        issues,
      });

      // Auto-import based on label mappings
      const importResult = await fetchMutation(
        api.github_issues.autoImportIssuesByLabel,
        { organizationId }
      );

      return NextResponse.json({
        success: true,
        synced: issues.length,
        imported: importResult.imported,
      });
    } catch (error) {
      // Update sync status to error
      await fetchMutation(api.github_issues.updateIssuesSyncStatus, {
        connectionId: connection._id,
        status: "error",
        error: error instanceof Error ? error.message : "Unknown error",
      });

      throw error;
    }
  } catch (error) {
    console.error("Error syncing issues:", error);
    return NextResponse.json(
      {
        error: "Failed to sync issues",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
