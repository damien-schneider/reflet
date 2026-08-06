/**
 * Repository read actions callable from the React client.
 * The installation token is minted and used server-side only — it never
 * reaches the browser.
 */
import { v } from "convex/values";
import { api, internal } from "../../_generated/api";
import type { Id } from "../../_generated/dataModel";
import type { ActionCtx } from "../../_generated/server";
import { action } from "../../_generated/server";

interface RepoAccess {
  repositoryFullName: string;
  token: string;
}

interface Branch {
  isProtected: boolean;
  name: string;
}

interface Tag {
  name: string;
  sha: string;
}

interface Commit {
  author: string;
  date: string;
  fullMessage: string;
  message: string;
  sha: string;
}

interface CommitComparison {
  aheadBy: number;
  commits: Commit[];
  files: Array<{
    additions: number;
    deletions: number;
    filename: string;
    status: string;
  }>;
  status: string;
  totalCommits: number;
}

async function requireRepoAccess(
  ctx: ActionCtx,
  organizationId: Id<"organizations">
): Promise<RepoAccess> {
  // getConnection checks auth + org membership
  const connection = await ctx.runQuery(
    api.integrations.github.queries.getConnection,
    { organizationId }
  );

  if (!connection) {
    throw new Error("No GitHub connection found");
  }

  if (!connection.repositoryFullName) {
    throw new Error("No repository connected");
  }

  const { token } = await ctx.runAction(
    internal.integrations.github.node_actions.getInstallationTokenInternal,
    { installationId: connection.installationId }
  );

  return { repositoryFullName: connection.repositoryFullName, token };
}

export const listBranches = action({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args): Promise<Branch[]> => {
    const { repositoryFullName, token } = await requireRepoAccess(
      ctx,
      args.organizationId
    );

    return await ctx.runAction(
      internal.integrations.github.release_actions.fetchBranches,
      { installationToken: token, repositoryFullName }
    );
  },
});

export const listTags = action({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args): Promise<Tag[]> => {
    const { repositoryFullName, token } = await requireRepoAccess(
      ctx,
      args.organizationId
    );

    return await ctx.runAction(
      internal.integrations.github.release_actions.fetchTags,
      { installationToken: token, repositoryFullName }
    );
  },
});

export const listRecentCommits = action({
  args: {
    branch: v.string(),
    organizationId: v.id("organizations"),
    perPage: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<Commit[]> => {
    const { repositoryFullName, token } = await requireRepoAccess(
      ctx,
      args.organizationId
    );

    return await ctx.runAction(
      internal.integrations.github.release_actions.fetchRecentCommits,
      {
        branch: args.branch,
        installationToken: token,
        perPage: args.perPage,
        repositoryFullName,
      }
    );
  },
});

export const listCommitsBetweenRefs = action({
  args: {
    base: v.string(),
    head: v.string(),
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args): Promise<CommitComparison> => {
    const { repositoryFullName, token } = await requireRepoAccess(
      ctx,
      args.organizationId
    );

    return await ctx.runAction(
      internal.integrations.github.release_actions.fetchCommitsBetweenRefs,
      {
        base: args.base,
        head: args.head,
        installationToken: token,
        repositoryFullName,
      }
    );
  },
});
