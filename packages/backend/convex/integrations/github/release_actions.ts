import { v } from "convex/values";
import { internalAction } from "../../_generated/server";

const GITHUB_API_URL = "https://api.github.com";

const GITHUB_HEADERS = {
  Accept: "application/vnd.github+json",
  "X-GitHub-Api-Version": "2022-11-28",
} as const;

/**
 * Fetch branches from a GitHub repository
 * Used by the setup wizard to let users pick a target branch
 */
export const fetchBranches = internalAction({
  args: {
    installationToken: v.string(),
    repositoryFullName: v.string(),
  },
  handler: async (_ctx, args) => {
    const response = await fetch(
      `${GITHUB_API_URL}/repos/${args.repositoryFullName}/branches?per_page=100`,
      {
        headers: {
          Authorization: `Bearer ${args.installationToken}`,
          ...GITHUB_HEADERS,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch branches: ${response.statusText}`);
    }

    const branches = (await response.json()) as Array<{
      name: string;
      protected: boolean;
    }>;

    return branches.map((branch) => ({
      isProtected: branch.protected,
      name: branch.name,
    }));
  },
});
