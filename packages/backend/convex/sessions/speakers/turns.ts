import { v } from "convex/values";
import type { Id } from "../../_generated/dataModel";
import { internalMutation, type QueryCtx } from "../../_generated/server";
import { loadSession, sessionActorValidator } from "../access";
import { SPEAKER_TURN_LIMITS } from "../constants";
import { speakerTurnValidator } from "../validators";
import type { SpeakerTurn } from "./attribution";

export async function loadSpeakerTurns(
  ctx: QueryCtx,
  sessionId: Id<"sessions">
): Promise<SpeakerTurn[]> {
  const batches = await ctx.db
    .query("sessionSpeakerTurns")
    .withIndex("by_session_start", (q) => q.eq("sessionId", sessionId))
    .collect();
  return batches
    .flatMap((batch) => batch.turns)
    .sort((a, b) => a.startMs - b.startMs);
}

export const record = internalMutation({
  args: {
    actor: sessionActorValidator,
    clientKey: v.string(),
    sessionId: v.string(),
    turns: v.array(speakerTurnValidator),
  },
  handler: async (ctx, args) => {
    const session = await loadSession(ctx, {
      access: "write",
      actor: args.actor,
      sessionId: args.sessionId,
    });
    const replayed = await ctx.db
      .query("sessionSpeakerTurns")
      .withIndex("by_session_client_key", (q) =>
        q.eq("sessionId", session._id).eq("clientKey", args.clientKey)
      )
      .unique();
    if (replayed) {
      return { accepted: replayed.turns.length, dropped: 0 };
    }
    const storedCount = session.usage.speakerTurnCount ?? 0;
    const accepted = args.turns.slice(
      0,
      Math.max(0, SPEAKER_TURN_LIMITS.maxPerSession - storedCount)
    );
    if (accepted.length > 0) {
      await ctx.db.insert("sessionSpeakerTurns", {
        clientKey: args.clientKey,
        createdAt: Date.now(),
        endMs: Math.max(...accepted.map((turn) => turn.endMs)),
        organizationId: session.organizationId,
        sessionId: session._id,
        startMs: Math.min(...accepted.map((turn) => turn.startMs)),
        turns: accepted,
      });
      await ctx.db.patch(session._id, {
        usage: {
          ...session.usage,
          speakerTurnCount: storedCount + accepted.length,
        },
      });
    }
    return {
      accepted: accepted.length,
      dropped: args.turns.length - accepted.length,
    };
  },
});
