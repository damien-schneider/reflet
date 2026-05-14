import { v } from "convex/values";
import { internalMutation } from "../../_generated/server";

const FILE_CACHE_RETENTION_MS = 14 * 24 * 60 * 60 * 1000;

export const cacheFile = internalMutation({
  args: {
    installationId: v.string(),
    repoFullName: v.string(),
    sha: v.string(),
    path: v.string(),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("codebaseFileCache")
      .withIndex("by_key", (q) =>
        q
          .eq("installationId", args.installationId)
          .eq("repoFullName", args.repoFullName)
          .eq("sha", args.sha)
          .eq("path", args.path)
      )
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        content: args.content,
        fetchedAt: Date.now(),
      });
      return;
    }

    await ctx.db.insert("codebaseFileCache", {
      installationId: args.installationId,
      repoFullName: args.repoFullName,
      sha: args.sha,
      path: args.path,
      content: args.content,
      fetchedAt: Date.now(),
    });
  },
});

export const upsertRepoMetadata = internalMutation({
  args: {
    installationId: v.string(),
    repoFullName: v.string(),
    description: v.optional(v.string()),
    languages: v.array(v.object({ name: v.string(), bytes: v.number() })),
    topics: v.array(v.string()),
    defaultBranch: v.string(),
    latestSha: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("codebaseRepoMetadata")
      .withIndex("by_repo", (q) =>
        q
          .eq("installationId", args.installationId)
          .eq("repoFullName", args.repoFullName)
      )
      .first();

    const now = Date.now();
    if (existing) {
      await ctx.db.patch(existing._id, {
        description: args.description,
        languages: args.languages,
        topics: args.topics,
        defaultBranch: args.defaultBranch,
        latestSha: args.latestSha,
        refreshedAt: now,
      });
      return existing._id;
    }

    return await ctx.db.insert("codebaseRepoMetadata", {
      installationId: args.installationId,
      repoFullName: args.repoFullName,
      description: args.description,
      languages: args.languages,
      topics: args.topics,
      defaultBranch: args.defaultBranch,
      latestSha: args.latestSha,
      refreshedAt: now,
    });
  },
});

export const startAgentRun = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    repoFullName: v.string(),
    purpose: v.union(v.literal("deep_analysis"), v.literal("ask")),
    userQuestion: v.optional(v.string()),
  },
  handler: async (ctx, args) =>
    await ctx.db.insert("codebaseAgentRuns", {
      organizationId: args.organizationId,
      repoFullName: args.repoFullName,
      purpose: args.purpose,
      status: "running",
      userQuestion: args.userQuestion,
      toolCallCount: 0,
      startedAt: Date.now(),
    }),
});

export const incrementToolCallCount = internalMutation({
  args: { runId: v.id("codebaseAgentRuns"), delta: v.number() },
  handler: async (ctx, args) => {
    const run = await ctx.db.get(args.runId);
    if (!run) {
      return;
    }
    await ctx.db.patch(args.runId, {
      toolCallCount: run.toolCallCount + args.delta,
    });
  },
});

export const completeAgentRun = internalMutation({
  args: {
    runId: v.id("codebaseAgentRuns"),
    assistantText: v.string(),
    inputTokens: v.optional(v.number()),
    outputTokens: v.optional(v.number()),
    costUsd: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.runId, {
      status: "completed",
      assistantText: args.assistantText,
      inputTokens: args.inputTokens,
      outputTokens: args.outputTokens,
      costUsd: args.costUsd,
      finishedAt: Date.now(),
    });
  },
});

export const failAgentRun = internalMutation({
  args: { runId: v.id("codebaseAgentRuns"), error: v.string() },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.runId, {
      status: "failed",
      error: args.error,
      finishedAt: Date.now(),
    });
  },
});

export const purgeStaleFileCache = internalMutation({
  args: {},
  handler: async (ctx) => {
    const cutoff = Date.now() - FILE_CACHE_RETENTION_MS;
    const stale = await ctx.db
      .query("codebaseFileCache")
      .filter((q) => q.lt(q.field("fetchedAt"), cutoff))
      .take(200);
    for (const row of stale) {
      await ctx.db.delete(row._id);
    }
    return stale.length;
  },
});
