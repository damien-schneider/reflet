import { v } from "convex/values";
import type { Doc, Id } from "../../_generated/dataModel";
import { internalQuery, type QueryCtx } from "../../_generated/server";
import {
  loadSession,
  sessionActorValidator,
  sessionFailure,
  sessionNotFound,
} from "../access";
import { LIVE_CONTEXT_LOOKBACK_MS } from "../constants";
import { quotedPassage } from "../formatters";
import {
  describeEvent,
  type LinkableEvidence,
  type ResolvedContext,
  resolveStoredSegment,
  type SessionEventValue,
  toLinkableEvent,
  toLinkableEvidence,
} from "../linking";

type EvidenceId = Id<"sessionEvidence">;
type TranscriptionState = Doc<"sessionSegments">["transcription"]["state"];

interface LiveEntry {
  atMs: number;
  endMs: number;
  id: string;
  lines: string[];
  screenshotIds: EvidenceId[];
}

const BAD_REQUEST_STATUS = 400;
const INVALID_SINCE = "sinceMs must be a whole number of milliseconds.";
const UNTRANSCRIBED_PASSAGE = "(this passage could not be transcribed)";
const STILL_TRANSCRIBING: TranscriptionState[] = ["pending", "running"];
const NEVER_TRANSCRIBED: TranscriptionState[] = ["failed", "expired"];

const liveEntry = (
  id: string,
  said: { endMs: number; startMs: number; text: string },
  resolved: ResolvedContext<EvidenceId>
): LiveEntry => ({
  atMs: said.startMs,
  endMs: said.endMs,
  id,
  lines: quotedPassage(
    { speech: null, startMs: said.startMs, text: said.text },
    resolved
  ),
  screenshotIds: resolved.context.flatMap(({ evidenceId }) =>
    evidenceId ? [evidenceId] : []
  ),
});

function typedNoteEntries(
  event: SessionEventValue,
  evidence: LinkableEvidence<EvidenceId>[]
): LiveEntry[] {
  if (event.kind !== "mark" && event.kind !== "select") {
    return [];
  }
  const note = event.note?.trim();
  const linkable = toLinkableEvent(event);
  if (!(note && linkable)) {
    return [];
  }
  return [
    liveEntry(
      `${event.kind}@${event.atMs}`,
      { endMs: event.atMs, startMs: event.atMs, text: `Note: ${note}` },
      {
        ambiguous: false,
        context: [describeEvent(linkable, evidence)],
        origin: "auto",
      }
    ),
  ];
}

function passageText(segment: Doc<"sessionSegments">): string | null {
  const { state } = segment.transcription;
  if (NEVER_TRANSCRIBED.includes(state)) {
    return UNTRANSCRIBED_PASSAGE;
  }
  if (state === "done" && segment.text.trim() !== "") {
    return segment.text;
  }
  return null;
}

async function citedScreenshots(
  ctx: QueryCtx,
  evidence: Doc<"sessionEvidence">[],
  entries: LiveEntry[]
): Promise<{ id: EvidenceId; url: string }[]> {
  const cited = new Set<string>(
    entries.flatMap(({ screenshotIds }) => screenshotIds)
  );
  const screenshots: { id: EvidenceId; url: string }[] = [];
  for (const item of evidence) {
    const url =
      cited.has(item._id) && item.image
        ? await ctx.storage.getUrl(item.image.storageId)
        : null;
    if (url) {
      screenshots.push({ id: item._id, url });
    }
  }
  return screenshots;
}

async function loadCaptureSince(
  ctx: QueryCtx,
  sessionId: Id<"sessions">,
  sinceMs: number
) {
  const contextFromMs = sinceMs - LIVE_CONTEXT_LOOKBACK_MS;
  const [segments, batches, evidence] = await Promise.all([
    ctx.db
      .query("sessionSegments")
      .withIndex("by_session_start", (q) =>
        q.eq("sessionId", sessionId).gte("startMs", sinceMs)
      )
      .collect(),
    ctx.db
      .query("sessionEventBatches")
      .withIndex("by_session_start", (q) =>
        q.eq("sessionId", sessionId).gte("startMs", contextFromMs)
      )
      .collect(),
    ctx.db
      .query("sessionEvidence")
      .withIndex("by_session_at", (q) =>
        q.eq("sessionId", sessionId).gte("atMs", contextFromMs)
      )
      .collect(),
  ]);
  const events = batches
    .flatMap((batch) => batch.events)
    .sort((a, b) => a.atMs - b.atMs);
  return { events, evidence, segments };
}

export const feed = internalQuery({
  args: {
    actor: sessionActorValidator,
    sessionId: v.string(),
    sinceMs: v.number(),
  },
  handler: async (ctx, { actor, sessionId, sinceMs }) => {
    const session = await loadSession(ctx, {
      access: "read",
      actor,
      sessionId,
    });
    if (session.authorId !== actor.userId || session.surface !== "live") {
      throw sessionNotFound();
    }
    if (!Number.isInteger(sinceMs) || sinceMs < 0) {
      throw sessionFailure(BAD_REQUEST_STATUS, INVALID_SINCE);
    }
    const { events, evidence, segments } = await loadCaptureSince(
      ctx,
      session._id,
      sinceMs
    );
    const linkable = evidence.map((item) => toLinkableEvidence(item, item._id));
    const passages = segments.flatMap((segment) => {
      const text = passageText(segment);
      return text === null
        ? []
        : [
            liveEntry(
              `${segment._id}@${segment.revision}`,
              { endMs: segment.endMs, startMs: segment.startMs, text },
              resolveStoredSegment(segment, { events, evidence: linkable })
            ),
          ];
    });
    const notes = events
      .filter((event) => event.atMs >= sinceMs)
      .flatMap((event) => typedNoteEntries(event, linkable));
    const entries = [...passages, ...notes].sort((a, b) => a.atMs - b.atMs);
    const running = segments.filter((segment) =>
      STILL_TRANSCRIBING.includes(segment.transcription.state)
    );
    return {
      entries,
      screenshots: await citedScreenshots(ctx, evidence, entries),
      session: {
        collection: session.collection,
        id: session._id,
        startedAt: session.startedAt,
        title: session.title,
      },
      transcription: {
        oldestRunningMs: running[0]?.startMs ?? null,
        running: running.length,
      },
    };
  },
});
