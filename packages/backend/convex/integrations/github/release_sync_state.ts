import type { Doc } from "../../_generated/dataModel";

export function isGithubReleaseOutdated(
  release: Pick<
    Doc<"releases">,
    "githubReleaseId" | "syncedFromGithub" | "githubSyncedAt" | "updatedAt"
  >
): boolean {
  return (
    release.githubReleaseId !== undefined &&
    !release.syncedFromGithub &&
    release.githubSyncedAt !== undefined &&
    release.updatedAt > release.githubSyncedAt
  );
}
