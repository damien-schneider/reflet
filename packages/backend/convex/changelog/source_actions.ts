import { v } from "convex/values";
import { internal } from "../_generated/api";
import type { Doc } from "../_generated/dataModel";
import type { QueryCtx } from "../_generated/server";
import { action, internalQuery } from "../_generated/server";
import { requireOrgAdmin } from "../shared/access";
import { findMaintainerNotes } from "./release_commits";
import {
  type CommitWindow,
  fetchAllTags,
  fetchComparedCommits,
  fetchGitHub,
  formatNonMergeCommitsNewestFirst,
  GITHUB_API_URL,
  type GitHubCommit,
} from "./retroactive_pipeline/github";
import {
  MAX_SOURCE_COMMITS,
  type ReleaseSource,
  selectReleaseRange,
} from "./source";
import { fetchPullRequestsBestEffort } from "./source_pull_requests";
import { releaseSourceValidator } from "./tableFields";

async function findPreviousHeadSha(
  ctx: QueryCtx,
  release: Doc<"releases">
): Promise<string | undefined> {
  const published = ctx.db
    .query("releases")
    .withIndex("by_published", (q) =>
      q.eq("organizationId", release.organizationId)
    )
    .order("desc");
  for await (const candidate of published) {
    const isEarlier =
      candidate.publishedAt !== undefined &&
      candidate._id !== release._id &&
      (release.publishedAt === undefined ||
        candidate.publishedAt < release.publishedAt);
    if (!isEarlier) {
      continue;
    }
    const snapshot = await ctx.db
      .query("releaseCommits")
      .withIndex("by_release", (q) => q.eq("releaseId", candidate._id))
      .first();
    if (snapshot?.headSha) {
      return snapshot.headSha;
    }
  }
}

export const getSourceContext = internalQuery({
  args: { releaseId: v.id("releases") },
  handler: async (ctx, args) => {
    const release = await ctx.db.get(args.releaseId);
    if (!release) {
      throw new Error("Release not found");
    }
    await requireOrgAdmin(
      ctx,
      release.organizationId,
      "read release source material"
    );
    const connection = await ctx.db
      .query("githubConnections")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", release.organizationId)
      )
      .first();
    if (!connection?.repositoryFullName) {
      throw new Error("No repository connected");
    }
    const organization = await ctx.db.get(release.organizationId);
    return {
      installationId: connection.installationId,
      organizationId: release.organizationId,
      previousHeadSha: await findPreviousHeadSha(ctx, release),
      repositoryFullName: connection.repositoryFullName,
      targetBranch:
        organization?.changelogSettings?.targetBranch ??
        connection.repositoryDefaultBranch ??
        "main",
      version: release.version,
    };
  },
});

export const getMaintainerNotes = internalQuery({
  args: { organizationId: v.id("organizations"), tagName: v.string() },
  handler: async (ctx, args) =>
    (await findMaintainerNotes(ctx, args.organizationId, args.tagName)) ?? null,
});

async function resolveCommitSha(
  token: string,
  repoFullName: string,
  ref: string
): Promise<string> {
  const encodedRef = ref.split("/").map(encodeURIComponent).join("/");
  const { data } = await fetchGitHub<{ sha: string }>(
    `${GITHUB_API_URL}/repos/${repoFullName}/commits/${encodedRef}`,
    token
  );
  return data.sha;
}

async function fetchRecentCommits(
  token: string,
  repoFullName: string,
  headSha: string
): Promise<CommitWindow> {
  const { data: newestFirst } = await fetchGitHub<GitHubCommit[]>(
    `${GITHUB_API_URL}/repos/${repoFullName}/commits?sha=${headSha}&per_page=${MAX_SOURCE_COMMITS}`,
    token
  );
  return {
    commits: formatNonMergeCommitsNewestFirst([...newestFirst].reverse()),
    files: [],
    totalCommits: newestFirst.length,
  };
}

export const resolveReleaseSource = action({
  args: { releaseId: v.id("releases"), version: v.optional(v.string()) },
  handler: async (ctx, args): Promise<ReleaseSource> => {
    const context = await ctx.runQuery(
      internal.changelog.source_actions.getSourceContext,
      { releaseId: args.releaseId }
    );
    const { token } = await ctx.runAction(
      internal.integrations.github.node_actions.getInstallationTokenInternal,
      { installationId: context.installationId }
    );
    const repoFullName = context.repositoryFullName;

    const range = selectReleaseRange({
      previousHeadSha: context.previousHeadSha,
      tags: await fetchAllTags(token, repoFullName),
      targetBranch: context.targetBranch,
      version: args.version ?? context.version,
    });
    const headSha =
      range.headTagSha ??
      (await resolveCommitSha(token, repoFullName, range.headRef));
    const window = range.baseRef
      ? await fetchComparedCommits(token, repoFullName, range.baseRef, headSha)
      : await fetchRecentCommits(token, repoFullName, headSha);
    const maintainerNotes = await ctx.runQuery(
      internal.changelog.source_actions.getMaintainerNotes,
      { organizationId: context.organizationId, tagName: range.headRef }
    );

    return {
      baseRef: range.baseRef,
      commits: window.commits,
      files: window.files,
      headRef: range.headRef,
      headSha,
      maintainerNotes: maintainerNotes ?? undefined,
      pullRequests: await fetchPullRequestsBestEffort(
        token,
        repoFullName,
        window.commits
      ),
      totalCommits: window.totalCommits,
    };
  },
  returns: releaseSourceValidator,
});
