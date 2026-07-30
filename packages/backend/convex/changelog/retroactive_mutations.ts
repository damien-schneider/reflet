import { v } from "convex/values";
import { internalMutation, internalQuery } from "../_generated/server";

// ============================================
// INTERNAL QUERIES
// ============================================

export const getJobInternal = internalQuery({
  args: { jobId: v.id("retroactiveJobs") },
  handler: async (ctx, args) => await ctx.db.get(args.jobId),
});

export const getCommitsForGroup = internalQuery({
  args: {
    groupId: v.string(),
    jobId: v.id("retroactiveJobs"),
  },
  handler: async (ctx, args) =>
    await ctx.db
      .query("retroactiveCommits")
      .withIndex("by_job_group", (q) =>
        q.eq("jobId", args.jobId).eq("groupId", args.groupId)
      )
      .collect(),
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
  handler: async (ctx, args) =>
    await ctx.db
      .query("retroactiveCommits")
      .withIndex("by_job", (q) => q.eq("jobId", args.jobId))
      .collect(),
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
    completedAt: v.optional(v.number()),
    createdReleaseIds: v.optional(v.array(v.id("releases"))),
    currentStep: v.optional(v.string()),
    error: v.optional(v.string()),
    fetchedCommits: v.optional(v.number()),
    jobId: v.id("retroactiveJobs"),
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
    groups: v.array(
      v.object({
        commitCount: v.number(),
        dateFrom: v.number(),
        dateTo: v.number(),
        error: v.optional(v.string()),
        generatedDescription: v.optional(v.string()),
        generatedTitle: v.optional(v.string()),
        id: v.string(),
        releaseId: v.optional(v.id("releases")),
        status: v.union(
          v.literal("pending"),
          v.literal("generating"),
          v.literal("generated"),
          v.literal("created"),
          v.literal("skipped"),
          v.literal("error")
        ),
        title: v.string(),
        version: v.optional(v.string()),
      })
    ),
    jobId: v.id("retroactiveJobs"),
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
    error: v.optional(v.string()),
    generatedDescription: v.optional(v.string()),
    generatedTitle: v.optional(v.string()),
    groupIndex: v.number(),
    jobId: v.id("retroactiveJobs"),
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
    commits: v.array(
      v.object({
        author: v.string(),
        date: v.string(),
        fullMessage: v.string(),
        message: v.string(),
        sha: v.string(),
      })
    ),
    groupId: v.string(),
    jobId: v.id("retroactiveJobs"),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("retroactiveCommits", {
      commits: args.commits,
      createdAt: Date.now(),
      groupId: args.groupId,
      jobId: args.jobId,
    });
  },
});

export const createDraftRelease = internalMutation({
  args: {
    commits: v.array(
      v.object({
        author: v.string(),
        date: v.string(),
        fullMessage: v.string(),
        message: v.string(),
        sha: v.string(),
      })
    ),
    description: v.string(),
    organizationId: v.id("organizations"),
    title: v.string(),
    version: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    const releaseId = await ctx.db.insert("releases", {
      createdAt: now,
      description: args.description,
      organizationId: args.organizationId,
      retroactivelyGenerated: true,
      title: args.title,
      updatedAt: now,
      version: args.version,
    });

    await ctx.db.insert("releaseCommits", {
      commits: args.commits,
      createdAt: now,
      releaseId,
    });

    return releaseId;
  },
});
