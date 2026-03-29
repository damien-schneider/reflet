import type { Id } from "@reflet/backend/convex/_generated/dataModel";

/**
 * Build the GitHub App install URL with user context.
 * Returns undefined if userId is not available yet.
 */
export function buildGitHubInstallUrl(params: {
  userId: string | undefined;
  organizationId?: Id<"organizations">;
  orgSlug?: string;
  returnTo?: string;
}): string | undefined {
  if (!params.userId) {
    return undefined;
  }
  const search = new URLSearchParams();
  search.set("userId", params.userId);
  if (params.organizationId) {
    search.set("organizationId", params.organizationId);
  }
  if (params.orgSlug) {
    search.set("orgSlug", params.orgSlug);
  }
  if (params.returnTo) {
    search.set("returnTo", params.returnTo);
  }
  return `/api/github/install?${search.toString()}`;
}
