import { v } from "convex/values";
import { internalMutation } from "../../_generated/server";
import { SYSTEM_ACTOR_ID } from "../../shared/actors";
import {
  applyGithubEdit,
  findMirror,
  githubReleaseSnapshotValidator,
  importMirroredRelease,
  removeMirror,
  upsertMirror,
} from "./release_mirror";

export const processReleaseWebhook = internalMutation({
  args: {
    action: v.string(),
    connectionId: v.id("githubConnections"),
    release: githubReleaseSnapshotValidator,
  },
  handler: async (ctx, args) => {
    const connection = await ctx.db.get(args.connectionId);
    if (!connection) {
      return;
    }

    if (args.action === "deleted") {
      const mirror = await findMirror(
        ctx,
        connection._id,
        args.release.githubReleaseId
      );
      if (mirror) {
        await removeMirror(ctx, mirror);
      }
      return;
    }

    const { mirror, previous } = await upsertMirror(
      ctx,
      connection,
      args.release
    );
    const now = Date.now();
    await ctx.db.patch(connection._id, {
      lastSyncAt: now,
      lastSyncStatus: "success",
      updatedAt: now,
    });

    if (args.action === "published" && connection.autoSyncReleases) {
      const org = await ctx.db.get(connection.organizationId);
      const autoPublish =
        org?.changelogSettings?.autoPublishImported !== false &&
        !mirror.isPrerelease;
      await importMirroredRelease(
        ctx,
        mirror,
        autoPublish ? { actorId: SYSTEM_ACTOR_ID, announce: true } : null
      );
      return;
    }

    if (args.action === "edited" && previous) {
      await applyGithubEdit(ctx, previous, mirror);
    }
  },
});
