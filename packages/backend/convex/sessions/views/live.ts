import type { Doc, Id } from "../../_generated/dataModel";
import { internalQuery, type QueryCtx } from "../../_generated/server";
import { type SessionActor, sessionActorValidator } from "../access";
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
import { type SpokenRun, segmentSpeech } from "../speakers/attribution";
import { loadSessionCapture } from "./detail";

type EvidenceId = Id<"sessionEvidence">;
type TranscriptionState = Doc<"sessionSegments">["transcription"]["state"];

interface LiveEntry {
  atMs: number;
  id: string;
  lines: string[];
  screenshotIds: EvidenceId[];
}

const STILL_TRANSCRIBING: TranscriptionState[] = ["pending", "running"];
const NEVER_TRANSCRIBED: TranscriptionState[] = ["failed", "expired"];

const NO_LIVE_SESSION = {
  entries: [],
  screenshots: [],
  session: null,
  transcription: { failed: 0, running: 0 },
};

async function latestDevtoolsSession(
  ctx: QueryCtx,
  actor: SessionActor
): Promise<Doc<"sessions"> | null> {
  const newestFirst = ctx.db
    .query("sessions")
    .withIndex("by_org_author", (q) =>
      q.eq("organizationId", actor.organizationId).eq("authorId", actor.userId)
    )
    .order("desc");
  for await (const session of newestFirst) {
    if (session.surface === "devtools" && session.deletedAt === undefined) {
      return session;
    }
  }
  return null;
}

const liveEntry = (
  id: string,
  said: { speech: SpokenRun[] | null; startMs: number; text: string },
  resolved: ResolvedContext<EvidenceId>
): LiveEntry => ({
  atMs: said.startMs,
  id,
  lines: quotedPassage(said, resolved),
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
      { speech: null, startMs: event.atMs, text: `Note: ${note}` },
      {
        ambiguous: false,
        context: [describeEvent(linkable, evidence)],
        origin: "auto",
      }
    ),
  ];
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

export const feed = internalQuery({
  args: { actor: sessionActorValidator },
  handler: async (ctx, { actor }) => {
    const session = await latestDevtoolsSession(ctx, actor);
    if (!session) {
      return NO_LIVE_SESSION;
    }
    const { events, evidence, segments, turns } = await loadSessionCapture(
      ctx,
      session._id
    );
    const linkable = evidence.map((item) => toLinkableEvidence(item, item._id));
    const passages = segments
      .filter(
        (segment) =>
          segment.transcription.state === "done" && segment.text.trim() !== ""
      )
      .map((segment) =>
        liveEntry(
          `${segment._id}@${segment.revision}`,
          {
            speech: segmentSpeech(segment, turns),
            startMs: segment.startMs,
            text: segment.text,
          },
          resolveStoredSegment(segment, { events, evidence: linkable })
        )
      );
    const entries = [
      ...passages,
      ...events.flatMap((event) => typedNoteEntries(event, linkable)),
    ].sort((a, b) => a.atMs - b.atMs);
    const countIn = (states: TranscriptionState[]) =>
      segments.filter((segment) => states.includes(segment.transcription.state))
        .length;
    return {
      entries,
      screenshots: await citedScreenshots(ctx, evidence, entries),
      session: {
        collection: session.collection,
        endedAt: session.endedAt ?? null,
        id: session._id,
        startedAt: session.startedAt,
        title: session.title,
      },
      transcription: {
        failed: countIn(NEVER_TRANSCRIBED),
        running: countIn(STILL_TRANSCRIBING),
      },
    };
  },
});
