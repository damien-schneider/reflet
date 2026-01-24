import { api } from "@reflet-v2/backend/convex/_generated/api";
import type { Id } from "@reflet-v2/backend/convex/_generated/dataModel";
import { fetchAction, fetchQuery } from "convex/nextjs";
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

    // Get installation access token
    const tokenResult = await fetchAction(
      api.github_actions.getInstallationToken,
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

    return NextResponse.json({ repositories });
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
