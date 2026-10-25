import { v } from "convex/values";
import type { Doc } from "../../_generated/dataModel";
import { internalMutation } from "../../_generated/server";
import {
  LIVE_SESSION_INTERRUPT_AFTER_MS,
  SESSION_CRON_BATCH_SIZE,
  SESSION_INTERRUPT_AFTER_MS,
} from "../constants";
import { closeOpenGap, openGap } from "./timeline";

function interruptedState(session: Doc<"sessions">): Partial<Doc<"sessions">> {
  const openGapStart =
    session.gaps.find((gap) => gap.endMs === null)?.startMs ?? 0;
  const endMs = Math.max(
    session.updatedAt - session.startedAt,
    openGapStart,
    0
  );
  const gaps =
    session.collection === "recording"
      ? openGap(session.gaps, { reason: "interrupted", startMs: endMs })
      : session.gaps;
  return {
    collection: "ended",
    endedAt: session.startedAt + endMs,
    gaps: closeOpenGap(gaps, endMs),
  };
}

export const endInterruptedSessions = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const cutoff = now - SESSION_INTERRUPT_AFTER_MS;
    const liveCutoff = now - LIVE_SESSION_INTERRUPT_AFTER_MS;
    for (const collection of ["recording", "paused"] as const) {
      const stale = await ctx.db
        .query("sessions")
        .withIndex("by_collection_updated", (q) =>
          q.eq("collection", collection).lt("updatedAt", cutoff)
        )
        .filter((q) =>
          q.or(
            q.neq(q.field("surface"), "live"),
            q.lt(q.field("updatedAt"), liveCutoff)
          )
        )
        .take(SESSION_CRON_BATCH_SIZE);
      for (const session of stale) {
        await ctx.db.patch(session._id, interruptedState(session));
      }
    }
    return null;
  },
  returns: v.null(),
});
