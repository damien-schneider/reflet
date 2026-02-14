import { api } from "@reflet/backend/convex/_generated/api";
import { fetchAction, fetchMutation } from "convex/nextjs";
import { NextResponse } from "next/server";
import { z } from "zod";
import { toOrgId } from "@/lib/convex-helpers";

/**
 * Sync releases from GitHub
 */
export async function POST(request: Request): Promise<NextResponse> {
  try {
    const syncBodySchema = z.object({ organizationId: z.string().min(1) });
    const body = syncBodySchema.parse(await request.json());
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
    await fetchMutation(api.github.updateSyncStatus, {
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

      // Fetch releases from GitHub
      const releases = await fetchAction(api.github_actions.fetchReleases, {
        installationToken: tokenResult.token,
        repositoryFullName: connection.repositoryFullName,
      });

      // Save synced releases
      await fetchMutation(api.github.saveSyncedReleases, {
        organizationId,
        releases,
      });

      return NextResponse.json({
        success: true,
        synced: releases.length,
      });
    } catch (error) {
      // Update sync status to error
      await fetchMutation(api.github.updateSyncStatus, {
        connectionId: connection._id,
        status: "error",
        error: error instanceof Error ? error.message : "Unknown error",
      });

      throw error;
    }
  } catch (error) {
    console.error("Error syncing releases:", error);
    return NextResponse.json(
      {
        error: "Failed to sync releases",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
