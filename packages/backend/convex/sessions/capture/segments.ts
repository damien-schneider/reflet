import { v } from "convex/values";
import type { Doc } from "../../_generated/dataModel";
import { internalMutation, type MutationCtx } from "../../_generated/server";
import {
  loadSession,
  loadSessionChild,
  sessionActorValidator,
  sessionConflict,
  sessionFailure,
  sessionLimitReached,
} from "../access";
import { scheduleTranscription } from "../ai/transcription";
import {
  RECORDED_WHILE_PAUSED,
  REVISION_CONFLICT,
  SESSION_LIMITS,
} from "../constants";
import { exceedsDuration, isCollectedAt } from "../lifecycle/timeline";
import { loadSegmentView } from "../views/detail";
import { claimFreshUpload, discardOrphanUpload } from "./uploads";

const BAD_REQUEST_STATUS = 400;
const SEGMENT_DURATION_TOLERANCE_MS = 2000;
const NOT_RETRYABLE = "This passage can't be transcribed again.";

function requireRecordable(
  session: Doc<"sessions">,
  segment: { endMs: number; startMs: number; voice: boolean }
): void {
  if (segment.voice && !isCollectedAt(session, segment.startMs)) {
    throw sessionConflict(RECORDED_WHILE_PAUSED);
  }
  if (segment.voice && exceedsDuration(session, segment.startMs)) {
    throw sessionLimitReached("duration");
  }
  if (session.usage.segmentCount >= SESSION_LIMITS.maxSegments) {
    throw sessionLimitReached("segments");
  }
  const lengthMs = segment.endMs - segment.startMs;
  if (
    segment.voice &&
    lengthMs > SESSION_LIMITS.maxSegmentMs + SEGMENT_DURATION_TOLERANCE_MS
  ) {
    throw sessionFailure(
      BAD_REQUEST_STATUS,
      "A passage is limited to 30 seconds."
    );
  }
}

async function recordSegmentUsage(
  ctx: MutationCtx,
  options: { audioBytes?: number; now: number; session: Doc<"sessions"> }
): Promise<void> {
  const { audioBytes, now, session } = options;
  await ctx.db.patch(session._id, {
    transcriptRevision:
      session.transcriptRevision + (audioBytes === undefined ? 1 : 0),
    updatedAt: now,
    usage: {
      ...session.usage,
      audioBytes: session.usage.audioBytes + (audioBytes ?? 0),
      segmentCount: session.usage.segmentCount + 1,
    },
  });
}

async function insertSegment(
  ctx: MutationCtx,
  input: {
    audioStorageId?: string;
    clientKey: string;
    endMs: number;
    session: Doc<"sessions">;
    startMs: number;
    text?: string;
  }
) {
  const { session } = input;
  const now = Date.now();
  const audio = input.audioStorageId
    ? await claimFreshUpload(ctx, {
        kind: "audio",
        storageId: input.audioStorageId,
      })
    : null;
  const segmentId = await ctx.db.insert("sessionSegments", {
    audio: audio
      ? {
          bytes: audio.bytes,
          expiresAt: now + SESSION_LIMITS.audioRetentionMs,
          storageId: audio.storageId,
        }
      : undefined,
    clientKey: input.clientKey,
    createdAt: now,
    endMs: input.endMs,
    organizationId: session.organizationId,
    revision: 0,
    sessionId: session._id,
    source: audio ? "voice" : "typed",
    startMs: input.startMs,
    text: audio ? "" : (input.text ?? ""),
    textOrigin: audio ? "transcription" : "human",
    transcription: {
      attempts: 0,
      state: audio ? "pending" : "done",
      updatedAt: now,
    },
    updatedAt: now,
  });
  await recordSegmentUsage(ctx, { audioBytes: audio?.bytes, now, session });
  if (audio) {
    await scheduleTranscription(ctx, segmentId);
  }
  return segmentId;
}

export const register = internalMutation({
  args: {
    actor: sessionActorValidator,
    audioStorageId: v.optional(v.string()),
    clientKey: v.string(),
    endMs: v.number(),
    sessionId: v.string(),
    startMs: v.number(),
    text: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const session = await loadSession(ctx, {
      access: "write",
      actor: args.actor,
      sessionId: args.sessionId,
    });
    const replayed = await ctx.db
      .query("sessionSegments")
      .withIndex("by_session_client_key", (q) =>
        q.eq("sessionId", session._id).eq("clientKey", args.clientKey)
      )
      .unique();
    if (replayed) {
      if (args.audioStorageId) {
        await discardOrphanUpload(ctx, {
          keptStorageId: replayed.audio?.storageId,
          storageId: args.audioStorageId,
        });
      }
      return { segment: await loadSegmentView(ctx, replayed) };
    }
    requireRecordable(session, {
      ...args,
      voice: args.audioStorageId !== undefined,
    });
    const segmentId = await insertSegment(ctx, { ...args, session });
    const segment = await ctx.db.get(segmentId);
    if (!segment) {
      throw new Error("Segment insert failed");
    }
    return { segment: await loadSegmentView(ctx, segment) };
  },
});

export async function flagProposalsCiting(
  ctx: MutationCtx,
  segment: Doc<"sessionSegments">
): Promise<void> {
  const proposals = await ctx.db
    .query("sessionProposals")
    .withIndex("by_session", (q) => q.eq("sessionId", segment.sessionId))
    .collect();
  for (const proposal of proposals) {
    if (proposal.segmentIds.includes(segment._id) && !proposal.needsReview) {
      await ctx.db.patch(proposal._id, { needsReview: true });
    }
  }
}

export const correct = internalMutation({
  args: {
    actor: sessionActorValidator,
    expectedRevision: v.number(),
    segmentId: v.string(),
    text: v.string(),
  },
  handler: async (ctx, args) => {
    const { child: segment, session } = await loadSessionChild(ctx, {
      access: "write",
      actor: args.actor,
      id: args.segmentId,
      table: "sessionSegments",
    });
    if (segment.revision !== args.expectedRevision) {
      throw sessionConflict(REVISION_CONFLICT);
    }
    const now = Date.now();
    const transcribing =
      segment.transcription.state === "pending" ||
      segment.transcription.state === "running";
    if (!transcribing && segment.audio) {
      await ctx.storage.delete(segment.audio.storageId);
    }
    await ctx.db.patch(segment._id, {
      audio: transcribing ? segment.audio : undefined,
      revision: segment.revision + 1,
      text: args.text,
      textOrigin: "human",
      transcription: transcribing
        ? segment.transcription
        : {
            ...segment.transcription,
            error: undefined,
            state: "done",
            updatedAt: now,
          },
      updatedAt: now,
    });
    await ctx.db.patch(session._id, {
      transcriptRevision: session.transcriptRevision + 1,
    });
    await flagProposalsCiting(ctx, segment);
    const corrected = await ctx.db.get(segment._id);
    if (!corrected) {
      throw new Error("Segment vanished during the correction");
    }
    return { segment: await loadSegmentView(ctx, corrected) };
  },
});

export const retry = internalMutation({
  args: { actor: sessionActorValidator, segmentId: v.string() },
  handler: async (ctx, args) => {
    const { child: segment } = await loadSessionChild(ctx, {
      access: "write",
      actor: args.actor,
      id: args.segmentId,
      table: "sessionSegments",
    });
    if (segment.transcription.state !== "failed" || !segment.audio) {
      throw sessionConflict(NOT_RETRYABLE);
    }
    await scheduleTranscription(ctx, segment._id);
    const retried = await ctx.db.get(segment._id);
    if (!retried) {
      throw new Error("Segment vanished during the retry");
    }
    return { segment: await loadSegmentView(ctx, retried) };
  },
});
