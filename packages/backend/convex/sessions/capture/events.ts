import { type Infer, v } from "convex/values";
import type { Doc } from "../../_generated/dataModel";
import { internalMutation } from "../../_generated/server";
import { loadSession, sessionActorValidator } from "../access";
import { SESSION_LIMITS } from "../constants";
import { exceedsDuration, isCollectedAt } from "../lifecycle/timeline";
import { sessionEventValidator } from "../validators";

type SessionEvent = Infer<typeof sessionEventValidator>;

function admitEvents(
  session: Doc<"sessions">,
  events: SessionEvent[]
): { accepted: SessionEvent[]; limitReached: boolean } {
  const remaining = SESSION_LIMITS.maxEvents - session.usage.eventCount;
  const collected = events.filter((event) =>
    isCollectedAt(session, event.atMs)
  );
  const withinDuration = collected.filter(
    (event) => !exceedsDuration(session, event.atMs)
  );
  const accepted = withinDuration.slice(0, Math.max(0, remaining));
  const limitReached =
    withinDuration.length < collected.length ||
    accepted.length < withinDuration.length ||
    accepted.length === remaining;
  return { accepted, limitReached };
}

export const record = internalMutation({
  args: {
    actor: sessionActorValidator,
    clientKey: v.string(),
    events: v.array(sessionEventValidator),
    sessionId: v.string(),
  },
  handler: async (ctx, args) => {
    const session = await loadSession(ctx, {
      access: "write",
      actor: args.actor,
      sessionId: args.sessionId,
    });
    const replayed = await ctx.db
      .query("sessionEventBatches")
      .withIndex("by_session_client_key", (q) =>
        q.eq("sessionId", session._id).eq("clientKey", args.clientKey)
      )
      .unique();
    if (replayed) {
      return {
        accepted: replayed.events.length,
        dropped: 0,
        limitReached: session.usage.eventCount >= SESSION_LIMITS.maxEvents,
      };
    }
    const { accepted, limitReached } = admitEvents(session, args.events);
    if (accepted.length > 0) {
      const times = accepted.map((event) => event.atMs);
      await ctx.db.insert("sessionEventBatches", {
        clientKey: args.clientKey,
        createdAt: Date.now(),
        endMs: Math.max(...times),
        events: accepted,
        organizationId: session.organizationId,
        sessionId: session._id,
        startMs: Math.min(...times),
      });
      await ctx.db.patch(session._id, {
        updatedAt: Date.now(),
        usage: {
          ...session.usage,
          eventCount: session.usage.eventCount + accepted.length,
        },
      });
    }
    return {
      accepted: accepted.length,
      dropped: args.events.length - accepted.length,
      limitReached,
    };
  },
});
