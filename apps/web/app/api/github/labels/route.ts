import { api } from "@reflet-v2/backend/convex/_generated/api";
import type { Id } from "@reflet-v2/backend/convex/_generated/dataModel";
import { fetchAction } from "convex/nextjs";
import { NextResponse } from "next/server";

/**
 * Fetch labels from GitHub repository
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

    // Fetch labels from GitHub
    const labels = await fetchAction(api.github_actions.fetchLabels, {
      installationToken: tokenResult.token,
      repositoryFullName: connection.repositoryFullName,
    });

    return NextResponse.json({ labels });
  } catch (error) {
    console.error("Error fetching labels:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch labels",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
