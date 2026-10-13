import { v } from "convex/values";
import type { Id } from "../../_generated/dataModel";
import { internalMutation, type MutationCtx } from "../../_generated/server";
import { loadSession, sessionActorValidator } from "../access";
import {
  SESSION_CRON_BATCH_SIZE,
  SESSION_TOMBSTONE_RETENTION_MS,
} from "../constants";
import {
  forgetSessionIntentions,
  removeSessionContributions,
} from "../intentions/lifecycle";

async function deleteSessionChildren(
  ctx: MutationCtx,
  sessionId: Id<"sessions">
): Promise<void> {
  const [segments, batches, evidence, proposals, handoffs] = await Promise.all([
    ctx.db
      .query("sessionSegments")
      .withIndex("by_session_start", (q) => q.eq("sessionId", sessionId))
      .collect(),
    ctx.db
      .query("sessionEventBatches")
      .withIndex("by_session_start", (q) => q.eq("sessionId", sessionId))
      .collect(),
    ctx.db
      .query("sessionEvidence")
      .withIndex("by_session_at", (q) => q.eq("sessionId", sessionId))
      .collect(),
    ctx.db
      .query("sessionProposals")
      .withIndex("by_session", (q) => q.eq("sessionId", sessionId))
      .collect(),
    ctx.db
      .query("sessionHandoffs")
      .withIndex("by_session", (q) => q.eq("sessionId", sessionId))
      .collect(),
  ]);
  const storageIds = [
    ...segments.flatMap((segment) =>
      segment.audio ? [segment.audio.storageId] : []
    ),
    ...evidence.flatMap((item) => (item.image ? [item.image.storageId] : [])),
  ];
  for (const storageId of storageIds) {
    await ctx.storage.delete(storageId);
  }
  for (const row of [
    ...segments,
    ...batches,
    ...evidence,
    ...proposals,
    ...handoffs,
  ]) {
    await ctx.db.delete(row._id);
  }
}

export const remove = internalMutation({
  args: { actor: sessionActorValidator, sessionId: v.string() },
  handler: async (ctx, { actor, sessionId }) => {
    const normalizedId = ctx.db.normalizeId("sessions", sessionId);
    const existing = normalizedId ? await ctx.db.get(normalizedId) : null;
    const alreadyDeleted =
      existing?.deletedAt !== undefined &&
      existing.organizationId === actor.organizationId &&
      existing.authorId === actor.userId;
    if (alreadyDeleted) {
      return { deleted: true };
    }
    const session = await loadSession(ctx, {
      access: "write",
      actor,
      sessionId,
    });
    await removeSessionContributions(ctx, session._id);
    await forgetSessionIntentions(ctx, session._id);
    await deleteSessionChildren(ctx, session._id);
    const now = Date.now();
    await ctx.db.patch(session._id, {
      deletedAt: now,
      startUrl: undefined,
      title: "",
      updatedAt: now,
    });
    return { deleted: true };
  },
});

export const purgeTombstones = internalMutation({
  args: {},
  handler: async (ctx) => {
    const tombstones = await ctx.db
      .query("sessions")
      .withIndex("by_deleted_at", (q) =>
        q
          .gt("deletedAt", 0)
          .lt("deletedAt", Date.now() - SESSION_TOMBSTONE_RETENTION_MS)
      )
      .take(SESSION_CRON_BATCH_SIZE);
    for (const tombstone of tombstones) {
      await ctx.db.delete(tombstone._id);
    }
    return null;
  },
  returns: v.null(),
});
