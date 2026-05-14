import { v } from "convex/values";
import { internalQuery } from "../../_generated/server";

export const getCachedFile = internalQuery({
  args: {
    installationId: v.string(),
    repoFullName: v.string(),
    sha: v.string(),
    path: v.string(),
  },
  handler: async (ctx, args) =>
    await ctx.db
      .query("codebaseFileCache")
      .withIndex("by_key", (q) =>
        q
          .eq("installationId", args.installationId)
          .eq("repoFullName", args.repoFullName)
          .eq("sha", args.sha)
          .eq("path", args.path)
      )
      .first(),
});

export const getRepoMetadata = internalQuery({
  args: {
    installationId: v.string(),
    repoFullName: v.string(),
  },
  handler: async (ctx, args) =>
    await ctx.db
      .query("codebaseRepoMetadata")
      .withIndex("by_repo", (q) =>
        q
          .eq("installationId", args.installationId)
          .eq("repoFullName", args.repoFullName)
      )
      .first(),
});

export const getLatestRunForOrg = internalQuery({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) =>
    await ctx.db
      .query("codebaseAgentRuns")
      .withIndex("by_org_started", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .order("desc")
      .first(),
});
