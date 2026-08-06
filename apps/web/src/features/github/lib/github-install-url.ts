import type { Id } from "@reflet/backend/convex/_generated/dataModel";

/**
 * Build the GitHub App install URL. The installation is bound to the session on
 * the callback, so no user id is sent — `userId` only gates on the session
 * being loaded. Returns undefined while it is not.
 */
export function buildGitHubInstallUrl(params: {
  userId: string | undefined;
  organizationId?: Id<"organizations">;
  orgSlug?: string;
  returnTo?: string;
}): string | undefined {
  if (!params.userId) {
    return;
  }
  const search = new URLSearchParams();
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
