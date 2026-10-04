import { v } from "convex/values";
import { internal } from "../_generated/api";
import { mutation } from "../_generated/server";
import { requireOrgAdmin } from "../shared/access";
import { feedbackStatus } from "../shared/validators";
import {
  deleteRelease,
  publishRelease,
  unpublishRelease,
} from "./release_lifecycle";

export const publish = mutation({
  args: {
    feedbackStatus: v.optional(feedbackStatus),
    id: v.id("releases"),
  },
  handler: async (ctx, args) => {
    const release = await ctx.db.get(args.id);
    if (!release) {
      throw new Error("Release not found");
    }
    const { user } = await requireOrgAdmin(
      ctx,
      release.organizationId,
      "publish releases"
    );

    await publishRelease(ctx, release, {
      actorId: user._id,
      announce: true,
      feedbackStatus: args.feedbackStatus,
      publishedAt: Date.now(),
    });

    return args.id;
  },
});

export const unpublish = mutation({
  args: { id: v.id("releases") },
  handler: async (ctx, args) => {
    const release = await ctx.db.get(args.id);
    if (!release) {
      throw new Error("Release not found");
    }
    await requireOrgAdmin(ctx, release.organizationId, "unpublish releases");

    await unpublishRelease(ctx, release);

    return args.id;
  },
});

export const remove = mutation({
  args: { id: v.id("releases") },
  handler: async (ctx, args) => {
    const release = await ctx.db.get(args.id);
    if (!release) {
      throw new Error("Release not found");
    }
    await requireOrgAdmin(ctx, release.organizationId, "delete releases");

    await deleteRelease(ctx, release);

    return true;
  },
});

export const pushToGithub = mutation({
  args: { releaseId: v.id("releases") },
  handler: async (ctx, args) => {
    const release = await ctx.db.get(args.releaseId);
    if (!release) {
      throw new Error("Release not found");
    }
    await requireOrgAdmin(
      ctx,
      release.organizationId,
      "push releases to GitHub"
    );

    if (release.githubPushStatus === "pending") {
      throw new Error("A push to GitHub is already in progress");
    }
    if (release.syncedFromGithub) {
      throw new Error("Releases imported from GitHub are edited on GitHub");
    }

    if (release.githubPushStatus === "failed") {
      await ctx.db.patch(args.releaseId, {
        githubPushError: undefined,
        githubPushErrorType: undefined,
        githubPushStatus: undefined,
        updatedAt: Date.now(),
      });
    }

    await ctx.scheduler.runAfter(
      0,
      internal.integrations.github.node_actions.pushReleaseToGithub,
      { manual: true, releaseId: args.releaseId }
    );

    return { scheduled: true };
  },
});

export const triggerGithubSync = mutation({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    await requireOrgAdmin(ctx, args.organizationId, "trigger sync");

    const connection = await ctx.db
      .query("githubConnections")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .first();

    if (!connection) {
      throw new Error("No GitHub connection found");
    }

    await ctx.scheduler.runAfter(
      0,
      internal.integrations.github.sync.syncAllReleases,
      {
        organizationId: args.organizationId,
      }
    );

    return { scheduled: true };
  },
});
