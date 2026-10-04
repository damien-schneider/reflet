import { v } from "convex/values";
import { internalMutation, mutation } from "../../_generated/server";
import { requireOrgAdmin } from "../../shared/access";
import {
  applyGithubEdit,
  findMirror,
  githubReleaseSnapshotValidator,
  importMirroredRelease,
  removeMirror,
  unlinkReleaseFromGithub,
  upsertMirror,
} from "./release_mirror";

export const updateSyncStatus = internalMutation({
  args: {
    connectionId: v.id("githubConnections"),
    error: v.optional(v.string()),
    status: v.union(
      v.literal("idle"),
      v.literal("syncing"),
      v.literal("success"),
      v.literal("error")
    ),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.connectionId, {
      lastSyncAt: Date.now(),
      lastSyncError: args.error,
      lastSyncStatus: args.status,
      updatedAt: Date.now(),
    });
  },
});

export const saveSyncedReleases = internalMutation({
  args: {
    connectionId: v.id("githubConnections"),
    releases: v.array(githubReleaseSnapshotValidator),
  },
  handler: async (ctx, args) => {
    const connection = await ctx.db.get(args.connectionId);
    if (!connection) {
      throw new Error("No GitHub connection found");
    }

    for (const release of args.releases) {
      const { mirror, previous } = await upsertMirror(ctx, connection, release);
      if (previous) {
        await applyGithubEdit(ctx, previous, mirror);
      }
    }

    const releaseIdsOnGithub = new Set(
      args.releases.map((release) => release.githubReleaseId)
    );
    const mirrors = await ctx.db
      .query("githubReleases")
      .withIndex("by_connection", (q) =>
        q.eq("githubConnectionId", connection._id)
      )
      .collect();
    for (const mirror of mirrors) {
      if (!releaseIdsOnGithub.has(mirror.githubReleaseId)) {
        await removeMirror(ctx, mirror);
      }
    }

    const now = Date.now();
    await ctx.db.patch(connection._id, {
      lastSyncAt: now,
      lastSyncError: undefined,
      lastSyncStatus: "success",
      updatedAt: now,
    });
  },
});

export const importGithubRelease = mutation({
  args: {
    githubReleaseId: v.id("githubReleases"),
  },
  handler: async (ctx, args) => {
    const mirror = await ctx.db.get(args.githubReleaseId);
    if (!mirror) {
      throw new Error("GitHub release not found");
    }

    const { user } = await requireOrgAdmin(
      ctx,
      mirror.organizationId,
      "import releases"
    );

    if (mirror.refletReleaseId) {
      throw new Error("This release has already been imported");
    }
    if (mirror.isDraft) {
      throw new Error("Draft GitHub releases can't be imported");
    }

    return await importMirroredRelease(ctx, mirror, {
      actorId: user._id,
      announce: false,
    });
  },
});

export const recordGithubPush = internalMutation({
  args: {
    githubHtmlUrl: v.string(),
    githubReleaseId: v.string(),
    pushed: v.object({
      body: v.string(),
      name: v.string(),
      tagName: v.string(),
    }),
    releaseId: v.id("releases"),
    syncedAt: v.number(),
  },
  handler: async (ctx, args) => {
    const release = await ctx.db.get(args.releaseId);
    if (!release) {
      return;
    }
    await ctx.db.patch(release._id, {
      githubHtmlUrl: args.githubHtmlUrl,
      githubPushError: undefined,
      githubPushErrorType: undefined,
      githubPushStatus: "success",
      githubReleaseId: args.githubReleaseId,
      githubSyncedAt: args.syncedAt,
    });

    const connection = await ctx.db
      .query("githubConnections")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", release.organizationId)
      )
      .first();
    const mirror =
      connection &&
      (await findMirror(ctx, connection._id, args.githubReleaseId));
    if (mirror) {
      await ctx.db.patch(mirror._id, {
        ...args.pushed,
        htmlUrl: args.githubHtmlUrl,
        refletReleaseId: release._id,
      });
    }
  },
});

export const clearGithubLink = internalMutation({
  args: { releaseId: v.id("releases") },
  handler: async (ctx, args) => {
    await unlinkReleaseFromGithub(ctx, args.releaseId);
    const mirrors = await ctx.db
      .query("githubReleases")
      .withIndex("by_reflet_release", (q) =>
        q.eq("refletReleaseId", args.releaseId)
      )
      .collect();
    for (const mirror of mirrors) {
      await ctx.db.patch(mirror._id, { refletReleaseId: undefined });
    }
  },
});

export const updateGithubPushStatus = internalMutation({
  args: {
    error: v.optional(v.string()),
    errorType: v.optional(v.string()),
    releaseId: v.id("releases"),
    status: v.union(v.literal("pending"), v.literal("failed")),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.releaseId, {
      githubPushError: args.error,
      githubPushErrorType: args.errorType,
      githubPushStatus: args.status,
    });
  },
});
