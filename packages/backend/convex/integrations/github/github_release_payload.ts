import { z } from "zod";
import type { GithubReleaseSnapshot } from "./release_mirror";

export const githubApiReleaseSchema = z.object({
  body: z.string().nullable(),
  created_at: z.string(),
  draft: z.boolean(),
  html_url: z.string(),
  id: z.number(),
  name: z.string().nullable(),
  prerelease: z.boolean(),
  published_at: z.string().nullable(),
  tag_name: z.string(),
});

export function toGithubReleaseSnapshot(
  release: z.infer<typeof githubApiReleaseSchema>
): GithubReleaseSnapshot {
  return {
    body: release.body ?? undefined,
    createdAt: new Date(release.created_at).getTime(),
    githubReleaseId: String(release.id),
    htmlUrl: release.html_url,
    isDraft: release.draft,
    isPrerelease: release.prerelease,
    name: release.name ?? undefined,
    publishedAt: release.published_at
      ? new Date(release.published_at).getTime()
      : undefined,
    tagName: release.tag_name,
  };
}
