import { v } from "convex/values";
import { internalMutation, internalQuery } from "../_generated/server";

// ============================================
// INTERNAL QUERIES
// ============================================

export const getJobInternal = internalQuery({
  args: { jobId: v.id("retroactiveJobs") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.jobId);
  },
});

export const getCommitsForGroup = internalQuery({
  args: {
    jobId: v.id("retroactiveJobs"),
    groupId: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("retroactiveCommits")
      .withIndex("by_job_group", (q) =>
        q.eq("jobId", args.jobId).eq("groupId", args.groupId)
      )
      .collect();
  },
});

export const getExistingVersions = internalQuery({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    const releases = await ctx.db
      .query("releases")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .collect();

    return releases.filter((r) => r.version).map((r) => r.version as string);
  },
});

export const getAllCommitsForJob = internalQuery({
  args: { jobId: v.id("retroactiveJobs") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("retroactiveCommits")
      .withIndex("by_job", (q) => q.eq("jobId", args.jobId))
      .collect();
  },
});

// ============================================
// INTERNAL MUTATIONS
// ============================================

export const deleteCommitDoc = internalMutation({
  args: { commitDocId: v.id("retroactiveCommits") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.commitDocId);
  },
});

export const updateJobProgress = internalMutation({
  args: {
    jobId: v.id("retroactiveJobs"),
    completedAt: v.optional(v.number()),
    createdReleaseIds: v.optional(v.array(v.id("releases"))),
    currentStep: v.optional(v.string()),
    error: v.optional(v.string()),
    fetchedCommits: v.optional(v.number()),
    processedGroups: v.optional(v.number()),
    status: v.optional(
      v.union(
        v.literal("pending"),
        v.literal("fetching_tags"),
        v.literal("fetching_commits"),
        v.literal("generating"),
        v.literal("creating_releases"),
        v.literal("completed"),
        v.literal("error"),
        v.literal("cancelled")
      )
    ),
    tags: v.optional(v.array(v.object({ name: v.string(), sha: v.string() }))),
    totalCommits: v.optional(v.number()),
    totalGroups: v.optional(v.number()),
    totalTags: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { jobId, ...updates } = args;
    const cleanUpdates: Record<string, unknown> = { updatedAt: Date.now() };

    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) {
        cleanUpdates[key] = value;
      }
    }

    await ctx.db.patch(jobId, cleanUpdates);
  },
});

export const updateJobGroups = internalMutation({
  args: {
    jobId: v.id("retroactiveJobs"),
    groups: v.array(
      v.object({
        id: v.string(),
        title: v.string(),
        version: v.optional(v.string()),
        dateFrom: v.number(),
        dateTo: v.number(),
        commitCount: v.number(),
        status: v.union(
          v.literal("pending"),
          v.literal("generating"),
          v.literal("generated"),
          v.literal("created"),
          v.literal("skipped"),
          v.literal("error")
        ),
        generatedTitle: v.optional(v.string()),
        generatedDescription: v.optional(v.string()),
        releaseId: v.optional(v.id("releases")),
        error: v.optional(v.string()),
      })
    ),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.jobId, {
      groups: args.groups,
      updatedAt: Date.now(),
    });
  },
});

export const updateGroupStatus = internalMutation({
  args: {
    jobId: v.id("retroactiveJobs"),
    error: v.optional(v.string()),
    generatedDescription: v.optional(v.string()),
    generatedTitle: v.optional(v.string()),
    groupIndex: v.number(),
    releaseId: v.optional(v.id("releases")),
    status: v.union(
      v.literal("pending"),
      v.literal("generating"),
      v.literal("generated"),
      v.literal("created"),
      v.literal("skipped"),
      v.literal("error")
    ),
  },
  handler: async (ctx, args) => {
    const job = await ctx.db.get(args.jobId);
    if (!job?.groups) {
      return;
    }

    const groups = [...job.groups];
    const group = groups[args.groupIndex];
    if (!group) {
      return;
    }

    groups[args.groupIndex] = {
      ...group,
      status: args.status,
      ...(args.generatedTitle === undefined
        ? {}
        : { generatedTitle: args.generatedTitle }),
      ...(args.generatedDescription === undefined
        ? {}
        : { generatedDescription: args.generatedDescription }),
      ...(args.releaseId === undefined ? {} : { releaseId: args.releaseId }),
      ...(args.error === undefined ? {} : { error: args.error }),
    };

    await ctx.db.patch(args.jobId, {
      groups,
      updatedAt: Date.now(),
    });
  },
});

export const saveCommitBatch = internalMutation({
  args: {
    jobId: v.id("retroactiveJobs"),
    commits: v.array(
      v.object({
        sha: v.string(),
        message: v.string(),
        fullMessage: v.string(),
        author: v.string(),
        date: v.string(),
      })
    ),
    groupId: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("retroactiveCommits", {
      jobId: args.jobId,
      groupId: args.groupId,
      commits: args.commits,
      createdAt: Date.now(),
    });
  },
});

export const createDraftRelease = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    commits: v.array(
      v.object({
        sha: v.string(),
        message: v.string(),
        fullMessage: v.string(),
        author: v.string(),
        date: v.string(),
      })
    ),
    description: v.string(),
    title: v.string(),
    version: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    const releaseId = await ctx.db.insert("releases", {
      organizationId: args.organizationId,
      title: args.title,
      description: args.description,
      version: args.version,
      retroactivelyGenerated: true,
      createdAt: now,
      updatedAt: now,
    });

    await ctx.db.insert("releaseCommits", {
      releaseId,
      commits: args.commits,
      createdAt: now,
    });

    return releaseId;
  },
});
