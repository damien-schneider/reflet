import { v } from "convex/values";
import type { Doc } from "../../_generated/dataModel";
import { internalMutation, type MutationCtx } from "../../_generated/server";
import {
  loadSession,
  type SessionActor,
  sessionActorValidator,
  sessionConflict,
} from "../access";
import { DEFAULT_SESSION_TITLE } from "../constants";
import { linkContinuation } from "../intentions/lifecycle";
import { gapReasonValidator } from "../validators";
import { reloadSessionSummary, shapeSessionSummary } from "../views/summary";
import { clampStartedAt, closeOpenGap, openGap } from "./timeline";

const SESSION_ENDED = "This session has ended.";

async function insertSession(
  ctx: MutationCtx,
  options: {
    actor: SessionActor;
    input: {
      clientKey: string;
      detectSpeakers?: boolean;
      page: { title: string; url: string };
      startedAt: number;
      surface: Doc<"sessions">["surface"];
      title?: string;
    };
  }
): Promise<Doc<"sessions">> {
  const { actor, input } = options;
  const now = Date.now();
  const sessionId = await ctx.db.insert("sessions", {
    analysis: { state: "idle" },
    authorId: actor.userId,
    clientKey: input.clientKey,
    collection: "recording",
    createdAt: now,
    detectSpeakers: input.detectSpeakers === true,
    gaps: [],
    organizationId: actor.organizationId,
    startedAt: clampStartedAt(input.startedAt, now),
    startUrl: input.page.url,
    surface: input.surface,
    title:
      input.title?.trim() || input.page.title.trim() || DEFAULT_SESSION_TITLE,
    transcriptRevision: 0,
    updatedAt: now,
    usage: {
      audioBytes: 0,
      eventCount: 0,
      evidenceCount: 0,
      segmentCount: 0,
    },
    visibility: "private",
  });
  const session = await ctx.db.get(sessionId);
  if (!session) {
    throw new Error("Session insert failed");
  }
  return session;
}

export const start = internalMutation({
  args: {
    actor: sessionActorValidator,
    clientKey: v.string(),
    continues: v.optional(
      v.object({ intentionId: v.string(), revision: v.number() })
    ),
    detectSpeakers: v.optional(v.boolean()),
    page: v.object({ title: v.string(), url: v.string() }),
    startedAt: v.number(),
    surface: v.union(
      v.literal("devtools"),
      v.literal("app"),
      v.literal("live")
    ),
    title: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { actor, continues, ...input } = args;
    const existing = await ctx.db
      .query("sessions")
      .withIndex("by_org_author_client_key", (q) =>
        q
          .eq("organizationId", actor.organizationId)
          .eq("authorId", actor.userId)
          .eq("clientKey", args.clientKey)
      )
      .unique();
    if (existing?.deletedAt !== undefined) {
      throw sessionConflict("This session was deleted.");
    }
    if (existing) {
      return {
        session: await shapeSessionSummary(ctx, { actor, session: existing }),
      };
    }
    const session = await insertSession(ctx, { actor, input });
    if (continues) {
      await linkContinuation(ctx, { actor, continues, session });
    }
    return { session: await shapeSessionSummary(ctx, { actor, session }) };
  },
});

type CollectionAction = "pause" | "resume" | "end";

function nextCollectionState(
  session: Doc<"sessions">,
  change: {
    action: CollectionAction;
    atMs: number;
    reason: Doc<"sessions">["gaps"][number]["reason"];
  }
): Partial<Doc<"sessions">> | null {
  if (session.collection === "ended") {
    if (change.action === "resume") {
      throw sessionConflict(SESSION_ENDED);
    }
    return null;
  }
  if (change.action === "end") {
    return {
      collection: "ended",
      endedAt: session.startedAt + Math.max(0, change.atMs),
      gaps: closeOpenGap(session.gaps, change.atMs),
    };
  }
  if (change.action === "pause") {
    return session.collection === "paused"
      ? null
      : {
          collection: "paused",
          gaps: openGap(session.gaps, {
            reason: change.reason,
            startMs: change.atMs,
          }),
        };
  }
  return session.collection === "recording"
    ? null
    : {
        collection: "recording",
        gaps: closeOpenGap(session.gaps, change.atMs),
      };
}

export const collection = internalMutation({
  args: {
    action: v.union(v.literal("pause"), v.literal("resume"), v.literal("end")),
    actor: sessionActorValidator,
    atMs: v.number(),
    reason: v.optional(gapReasonValidator),
    sessionId: v.string(),
  },
  handler: async (ctx, args) => {
    const session = await loadSession(ctx, {
      access: "write",
      actor: args.actor,
      sessionId: args.sessionId,
    });
    const patch = nextCollectionState(session, {
      action: args.action,
      atMs: args.atMs,
      reason: args.reason ?? "paused",
    });
    if (patch) {
      await ctx.db.patch(session._id, { ...patch, updatedAt: Date.now() });
    }
    return await reloadSessionSummary(ctx, { actor: args.actor, session });
  },
});

export const update = internalMutation({
  args: {
    actor: sessionActorValidator,
    sessionId: v.string(),
    title: v.optional(v.string()),
    visibility: v.optional(v.union(v.literal("private"), v.literal("team"))),
  },
  handler: async (ctx, args) => {
    const session = await loadSession(ctx, {
      access: "write",
      actor: args.actor,
      sessionId: args.sessionId,
    });
    const title = args.title?.trim();
    await ctx.db.patch(session._id, {
      ...(title ? { title } : {}),
      ...(args.visibility ? { visibility: args.visibility } : {}),
      updatedAt: Date.now(),
    });
    return await reloadSessionSummary(ctx, { actor: args.actor, session });
  },
});
