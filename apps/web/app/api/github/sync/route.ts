import { api } from "@reflet-v2/backend/convex/_generated/api";
import type { Id } from "@reflet-v2/backend/convex/_generated/dataModel";
import { fetchAction, fetchMutation, fetchQuery } from "convex/nextjs";
import { NextResponse } from "next/server";

/**
 * Sync releases from GitHub
 */
export async function POST(request: Request): Promise<NextResponse> {
  try {
    const body = (await request.json()) as { organizationId: string };
    const organizationId = body.organizationId as Id<"organizations">;

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

    // Update sync status to syncing
    await fetchMutation(api.github.updateSyncStatus, {
      connectionId: connection._id,
      status: "syncing",
    });

    try {
      // Get installation access token
      const tokenResult = await fetchAction(
        api.github_actions.getInstallationToken,
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
