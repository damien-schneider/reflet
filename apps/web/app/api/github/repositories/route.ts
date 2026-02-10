import { api } from "@reflet/backend/convex/_generated/api";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { fetchAction } from "convex/nextjs";
import { NextResponse } from "next/server";

/**
 * Fetch repositories from GitHub installation
 */
export async function GET(request: Request): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const organizationId = searchParams.get(
    "organizationId"
  ) as Id<"organizations">;

  if (!organizationId) {
    return NextResponse.json(
      { error: "Organization ID is required" },
      { status: 400 }
    );
  }

  try {
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

    // Get installation access token
    const tokenResult = await fetchAction(
      api.github_node_actions.getInstallationToken,
      {
        installationId: connection.installationId,
      }
    );

    // Fetch repositories
    const repositories = await fetchAction(
      api.github_actions.fetchRepositories,
      {
        installationToken: tokenResult.token,
      }
    );

    console.log(`[API Route] Returning ${repositories.length} repositories`);

    return NextResponse.json(
      { repositories },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
          Pragma: "no-cache",
          Expires: "0",
        },
      }
    );
  } catch (error) {
    console.error("Error fetching repositories:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch repositories",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
