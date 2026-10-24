import { v } from "convex/values";
import { internal } from "../../_generated/api";
import type { Doc, Id } from "../../_generated/dataModel";
import { internalMutation, type MutationCtx } from "../../_generated/server";
import { SESSION_CRON_BATCH_SIZE } from "../constants";
import { spokenWordValidator } from "../validators";
import { startWaitingAnalysis } from "./analysis_request";
import { followRecording } from "./live_analysis";

const RETRY_DELAYS_MS = [30_000, 120_000] as const;
const AUDIO_MISSING = "The recording of this passage is no longer available.";

const deleteAudioFile = async (
  ctx: MutationCtx,
  storageId: Id<"_storage">
): Promise<void> => {
  if (await ctx.db.system.get(storageId)) {
    await ctx.storage.delete(storageId);
  }
};

const loadLiveSegment = async (
  ctx: MutationCtx,
  segmentId: Id<"sessionSegments">
): Promise<Doc<"sessionSegments"> | null> => {
  const segment = await ctx.db.get(segmentId);
  const session = segment ? await ctx.db.get(segment.sessionId) : null;
  return session && session.deletedAt === undefined ? segment : null;
};

const settleSegment = async (
  ctx: MutationCtx,
  options: {
    segment: Doc<"sessionSegments">;
    state: "done" | "empty" | "failed";
    error?: string;
  }
): Promise<void> => {
  const { segment, state, error } = options;
  const now = Date.now();
  if (segment.audio && state !== "failed") {
    await deleteAudioFile(ctx, segment.audio.storageId);
  }
  await ctx.db.patch(segment._id, {
    audio: state === "failed" ? segment.audio : undefined,
    transcription: {
      attempts: segment.transcription.attempts,
      error,
      state,
      updatedAt: now,
    },
    updatedAt: now,
  });
  await startWaitingAnalysis(ctx, segment.sessionId);
  await followRecording(ctx, segment.sessionId);
};

const isCurrentAttempt = (
  segment: Doc<"sessionSegments">,
  attempt: number
): boolean =>
  segment.transcription.state === "running" &&
  segment.transcription.attempts === attempt;

export const claimTranscription = internalMutation({
  args: { segmentId: v.id("sessionSegments") },
  handler: async (ctx, { segmentId }) => {
    const segment = await loadLiveSegment(ctx, segmentId);
    if (segment?.transcription.state !== "pending") {
      return null;
    }
    if (segment.textOrigin === "human") {
      await settleSegment(ctx, { segment, state: "done" });
      return null;
    }
    if (!segment.audio) {
      await settleSegment(ctx, {
        error: AUDIO_MISSING,
        segment,
        state: "failed",
      });
      return null;
    }
    const attempt = segment.transcription.attempts + 1;
    await ctx.db.patch(segmentId, {
      transcription: {
        attempts: attempt,
        state: "running",
        updatedAt: Date.now(),
      },
    });
    const session = await ctx.db.get(segment.sessionId);
    return {
      attempt,
      storageId: segment.audio.storageId,
      wordTimings: session?.detectSpeakers
        ? { segmentStartMs: segment.startMs }
        : null,
    };
  },
  returns: v.union(
    v.null(),
    v.object({
      attempt: v.number(),
      storageId: v.id("_storage"),
      wordTimings: v.union(v.null(), v.object({ segmentStartMs: v.number() })),
    })
  ),
});

export const saveTranscription = internalMutation({
  args: {
    attempt: v.number(),
    language: v.union(v.string(), v.null()),
    segmentId: v.id("sessionSegments"),
    storageId: v.id("_storage"),
    text: v.string(),
    words: v.array(spokenWordValidator),
  },
  handler: async (ctx, args) => {
    const segment = await loadLiveSegment(ctx, args.segmentId);
    if (!segment) {
      await deleteAudioFile(ctx, args.storageId);
      return null;
    }
    if (!isCurrentAttempt(segment, args.attempt)) {
      return null;
    }
    if (segment.textOrigin === "human" || args.text === "") {
      await settleSegment(ctx, {
        segment,
        state: segment.textOrigin === "human" ? "done" : "empty",
      });
      return null;
    }
    await ctx.db.patch(segment._id, {
      language: args.language ?? undefined,
      revision: segment.revision + 1,
      text: args.text,
      words: args.words.length > 0 ? args.words : undefined,
    });
    const session = await ctx.db.get(segment.sessionId);
    if (session) {
      await ctx.db.patch(session._id, {
        transcriptRevision: session.transcriptRevision + 1,
      });
    }
    await settleSegment(ctx, { segment, state: "done" });
    return null;
  },
  returns: v.null(),
});

export const recordTranscriptionFailure = internalMutation({
  args: {
    attempt: v.number(),
    error: v.string(),
    retryable: v.boolean(),
    segmentId: v.id("sessionSegments"),
  },
  handler: async (ctx, args) => {
    const segment = await loadLiveSegment(ctx, args.segmentId);
    if (!(segment && isCurrentAttempt(segment, args.attempt))) {
      return null;
    }
    if (segment.textOrigin === "human") {
      await settleSegment(ctx, { segment, state: "done" });
      return null;
    }
    const retryDelayMs = args.retryable
      ? RETRY_DELAYS_MS[args.attempt - 1]
      : undefined;
    if (retryDelayMs === undefined) {
      await settleSegment(ctx, { error: args.error, segment, state: "failed" });
      return null;
    }
    await ctx.db.patch(segment._id, {
      transcription: {
        attempts: args.attempt,
        error: args.error,
        state: "pending",
        updatedAt: Date.now(),
      },
    });
    await ctx.scheduler.runAfter(
      retryDelayMs,
      internal.sessions.ai.transcription.transcribeSegment,
      { segmentId: segment._id }
    );
    return null;
  },
  returns: v.null(),
});

const stateAfterAudioExpiry = (
  segment: Doc<"sessionSegments">
): Doc<"sessionSegments">["transcription"]["state"] => {
  const { state } = segment.transcription;
  if (state === "done" || state === "empty") {
    return state;
  }
  return segment.textOrigin === "human" ? "done" : "expired";
};

export const expireSessionAudio = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const expired = await ctx.db
      .query("sessionSegments")
      .withIndex("by_audio_expiry", (q) =>
        q.gte("audio.expiresAt", 0).lte("audio.expiresAt", now)
      )
      .take(SESSION_CRON_BATCH_SIZE);
    const sessionIds = new Set<Id<"sessions">>();
    for (const segment of expired) {
      if (segment.audio) {
        await deleteAudioFile(ctx, segment.audio.storageId);
      }
      await ctx.db.patch(segment._id, {
        audio: undefined,
        transcription: {
          attempts: segment.transcription.attempts,
          state: stateAfterAudioExpiry(segment),
          updatedAt: now,
        },
      });
      sessionIds.add(segment.sessionId);
    }
    for (const sessionId of sessionIds) {
      await startWaitingAnalysis(ctx, sessionId);
    }
    if (expired.length === SESSION_CRON_BATCH_SIZE) {
      await ctx.scheduler.runAfter(
        0,
        internal.sessions.ai.transcription_state.expireSessionAudio,
        {}
      );
    }
    return null;
  },
  returns: v.null(),
});
