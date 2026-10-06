import { v } from "convex/values";
import { internal } from "../_generated/api";
import type { Doc, Id } from "../_generated/dataModel";
import { type MutationCtx, mutation, query } from "../_generated/server";
import { consumeAiGenerationFor } from "../ai/usage_gate";
import { authComponent } from "../auth/auth";
import { requireOrgAdmin } from "../shared/access";
import {
  deleteRelease,
  publishRelease,
  releaseSourceDate,
} from "./release_lifecycle";

async function loadRetroactiveDrafts(
  ctx: MutationCtx,
  releaseIds: Id<"releases">[],
  action: string
): Promise<{ actorId: string; drafts: Doc<"releases">[] }> {
  const drafts: Doc<"releases">[] = [];
  for (const releaseId of releaseIds) {
    const release = await ctx.db.get(releaseId);
    if (!release) {
      throw new Error("Release not found");
    }
    drafts.push(release);
  }

  const [firstDraft] = drafts;
  if (!firstDraft) {
    throw new Error(`No releases provided to ${action}`);
  }
  const { user } = await requireOrgAdmin(
    ctx,
    firstDraft.organizationId,
    `${action} releases`
  );

  for (const draft of drafts) {
    if (draft.organizationId !== firstDraft.organizationId) {
      throw new Error("All releases must belong to the same organization");
    }
    if (!draft.retroactivelyGenerated || draft.publishedAt) {
      throw new Error(
        `Release "${draft.title}" is not an unpublished retroactive draft`
      );
    }
  }
  return { actorId: user._id, drafts };
}

export const startRetroactiveChangelog = mutation({
  args: {
    groupingStrategy: v.union(
      v.literal("tags"),
      v.literal("weekly"),
      v.literal("auto")
    ),
    organizationId: v.id("organizations"),
    skipExistingVersions: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { user } = await requireOrgAdmin(
      ctx,
      args.organizationId,
      "start retroactive changelog generation"
    );
    await consumeAiGenerationFor(ctx, {
      organizationId: args.organizationId,
      userId: user._id,
    });

    const existingJobs = await ctx.db
      .query("retroactiveJobs")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .collect();

    const terminalStatuses = new Set(["completed", "error", "cancelled"]);
    const activeJob = existingJobs.find(
      (job) => !terminalStatuses.has(job.status)
    );

    if (activeJob) {
      throw new Error(
        "A retroactive changelog job is already in progress for this organization"
      );
    }

    const org = await ctx.db.get(args.organizationId);
    const connection = await ctx.db
      .query("githubConnections")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .first();

    if (!connection) {
      throw new Error(
        "No GitHub connection found. Connect a repository before generating a retroactive changelog."
      );
    }

    const targetBranch =
      org?.changelogSettings?.targetBranch ??
      connection.repositoryDefaultBranch ??
      "main";
    const skipExisting = args.skipExistingVersions ?? true;

    const now = Date.now();
    const jobId = await ctx.db.insert("retroactiveJobs", {
      createdAt: now,
      groupingStrategy: args.groupingStrategy,
      organizationId: args.organizationId,
      skipExistingVersions: skipExisting,
      status: "pending",
      targetBranch,
      updatedAt: now,
    });

    await ctx.scheduler.runAfter(
      0,
      internal.changelog.retroactive_actions.fetchTagsPhase,
      { jobId }
    );

    return jobId;
  },
});

export const cancelRetroactiveChangelog = mutation({
  args: {
    jobId: v.id("retroactiveJobs"),
  },
  handler: async (ctx, args) => {
    const job = await ctx.db.get(args.jobId);
    if (!job) {
      throw new Error("Retroactive job not found");
    }
    await requireOrgAdmin(
      ctx,
      job.organizationId,
      "cancel retroactive changelog jobs"
    );

    await ctx.db.patch(args.jobId, {
      status: "cancelled",
      updatedAt: Date.now(),
    });
  },
});

export const getRetroactiveJob = query({
  args: {
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) {
      return null;
    }

    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_org_user", (q) =>
        q.eq("organizationId", args.organizationId).eq("userId", user._id)
      )
      .unique();

    if (!membership) {
      return null;
    }

    const jobs = await ctx.db
      .query("retroactiveJobs")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .collect();

    if (jobs.length === 0) {
      return null;
    }

    jobs.sort((a, b) => b.createdAt - a.createdAt);
    return jobs[0] ?? null;
  },
});

export const publishRetroactiveDrafts = mutation({
  args: {
    releaseIds: v.array(v.id("releases")),
    useHistoricalDates: v.boolean(),
  },
  handler: async (ctx, args) => {
    const { actorId, drafts } = await loadRetroactiveDrafts(
      ctx,
      args.releaseIds,
      "publish"
    );

    const now = Date.now();
    for (const draft of drafts) {
      const snapshot = await ctx.db
        .query("releaseCommits")
        .withIndex("by_release", (q) => q.eq("releaseId", draft._id))
        .first();
      const publishedAt = args.useHistoricalDates
        ? releaseSourceDate(draft, snapshot)
        : now;
      await publishRelease(ctx, draft, {
        actorId,
        announce: false,
        publishedAt,
      });
    }
  },
});

export const discardRetroactiveDrafts = mutation({
  args: {
    releaseIds: v.array(v.id("releases")),
  },
  handler: async (ctx, args) => {
    const { drafts } = await loadRetroactiveDrafts(
      ctx,
      args.releaseIds,
      "discard"
    );

    for (const draft of drafts) {
      await deleteRelease(ctx, draft);
    }
  },
});
