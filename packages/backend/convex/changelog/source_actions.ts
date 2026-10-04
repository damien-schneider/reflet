import { v } from "convex/values";
import { z } from "zod";
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
  MAX_SOURCE_PULL_REQUESTS,
  type ReleaseSource,
  selectReleaseRange,
} from "./source";
import {
  type ReleaseCommit,
  type ReleasePullRequest,
  releaseSourceValidator,
} from "./tableFields";

const MAX_PULL_REQUEST_BODY_LENGTH = 2000;
const PULL_REQUESTS_PER_COMMIT = 5;

const pullRequestResponseSchema = z.object({
  data: z.object({
    repository: z.record(
      z.string(),
      z
        .object({
          associatedPullRequests: z.object({
            nodes: z.array(
              z.object({
                body: z.string().nullable(),
                number: z.number(),
                title: z.string(),
                url: z.string(),
              })
            ),
          }),
        })
        .nullable()
    ),
  }),
});

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

async function fetchPullRequests(
  token: string,
  repoFullName: string,
  commits: ReleaseCommit[]
): Promise<ReleasePullRequest[]> {
  if (commits.length === 0) {
    return [];
  }
  const [owner, name] = repoFullName.split("/");
  const commitFields = commits
    .map(
      (commit, index) =>
        `c${index}: object(oid: "${commit.sha}") { ... on Commit { associatedPullRequests(first: ${PULL_REQUESTS_PER_COMMIT}) { nodes { number title body url } } } }`
    )
    .join("\n");
  const response = await fetch(`${GITHUB_API_URL}/graphql`, {
    body: JSON.stringify({
      query: `query($owner: String!, $name: String!) { repository(owner: $owner, name: $name) { ${commitFields} } }`,
      variables: { name, owner },
    }),
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    method: "POST",
  });
  if (!response.ok) {
    throw new Error(
      `GitHub GraphQL ${response.status} ${response.statusText} while loading pull requests`
    );
  }
  const { data } = pullRequestResponseSchema.parse(await response.json());
  const byNumber = new Map<number, ReleasePullRequest>();
  for (const commitNode of Object.values(data.repository)) {
    for (const pullRequest of commitNode?.associatedPullRequests.nodes ?? []) {
      if (byNumber.has(pullRequest.number)) {
        continue;
      }
      byNumber.set(pullRequest.number, {
        body: pullRequest.body
          ? pullRequest.body.slice(0, MAX_PULL_REQUEST_BODY_LENGTH)
          : undefined,
        number: pullRequest.number,
        title: pullRequest.title,
        url: pullRequest.url,
      });
    }
  }
  return [...byNumber.values()].slice(0, MAX_SOURCE_PULL_REQUESTS);
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
      pullRequests: await fetchPullRequests(
        token,
        repoFullName,
        window.commits
      ),
      totalCommits: window.totalCommits,
    };
  },
  returns: releaseSourceValidator,
});
