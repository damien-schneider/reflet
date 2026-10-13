import { type Infer, v } from "convex/values";
import type { Doc, Id } from "../../_generated/dataModel";
import {
  internalMutation,
  internalQuery,
  type QueryCtx,
} from "../../_generated/server";
import {
  loadSessionChild,
  requireIdsInSession,
  sessionActorValidator,
  sessionConflict,
  sessionNotFound,
} from "../access";
import { flagProposalsCiting } from "../capture/segments";
import { REVISION_CONFLICT } from "../constants";
import {
  type ContextPin,
  describeEvent,
  describeEvidence,
  type LinkableEvent,
  type SegmentContextValue,
  toLinkableEvent,
  toLinkableEvidence,
} from "../linking";
import { linkableEventKindValidator } from "../validators";
import {
  loadSegmentView,
  loadSessionEvents,
  loadSessionEvidence,
} from "../views/detail";

const CHOICES_BEFORE_MS = 30_000;
const CHOICES_AFTER_MS = 10_000;
const MAX_CONTEXT_CHOICES = 20;

const requestedChoiceValidator = v.union(
  v.object({ kind: v.literal("auto") }),
  v.object({ kind: v.literal("unknown") }),
  v.object({
    atMs: v.number(),
    eventKind: linkableEventKindValidator,
    kind: v.literal("event"),
  }),
  v.object({ evidenceId: v.string(), kind: v.literal("evidence") })
);

type ContextChoiceView =
  | Exclude<ContextPin, { kind: "evidence" }>
  | { evidenceId: Id<"sessionEvidence">; kind: "evidence" };

const linkableEvents = (events: Doc<"sessionEventBatches">["events"]) =>
  events.flatMap((event) => {
    const linkable = toLinkableEvent(event);
    return linkable ? [linkable] : [];
  });

const isSameEvent = (
  event: LinkableEvent,
  choice: { atMs: number; eventKind: LinkableEvent["kind"] }
): boolean => event.atMs === choice.atMs && event.kind === choice.eventKind;

async function validatedPin(
  ctx: QueryCtx,
  options: {
    choice: Infer<typeof requestedChoiceValidator>;
    sessionId: Id<"sessions">;
  }
): Promise<ContextChoiceView | undefined> {
  const { choice, sessionId } = options;
  switch (choice.kind) {
    case "auto":
      return undefined;
    case "unknown":
      return choice;
    case "event": {
      const events = linkableEvents(await loadSessionEvents(ctx, sessionId));
      if (!events.some((event) => isSameEvent(event, choice))) {
        throw sessionNotFound();
      }
      return choice;
    }
    default: {
      const [evidenceId] = await requireIdsInSession(ctx, {
        ids: [choice.evidenceId],
        sessionId,
        table: "sessionEvidence",
      });
      return evidenceId ? { evidenceId, kind: "evidence" } : undefined;
    }
  }
}

export const setContext = internalMutation({
  args: {
    actor: sessionActorValidator,
    choice: requestedChoiceValidator,
    expectedRevision: v.number(),
    segmentId: v.string(),
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
    const pin = await validatedPin(ctx, {
      choice: args.choice,
      sessionId: session._id,
    });
    const now = Date.now();
    await ctx.db.patch(segment._id, {
      contextCorrection: pin
        ? { at: now, by: args.actor.userId, choice: pin }
        : undefined,
      revision: segment.revision + 1,
      updatedAt: now,
    });
    await ctx.db.patch(session._id, {
      transcriptRevision: session.transcriptRevision + 1,
      updatedAt: now,
    });
    await flagProposalsCiting(ctx, segment);
    const updated = await ctx.db.get(segment._id);
    if (!updated) {
      throw new Error("Segment vanished during the context change");
    }
    return { segment: await loadSegmentView(ctx, updated) };
  },
});

const isSelected = (
  choice: ContextChoiceView,
  pin: ContextPin | undefined
): boolean => {
  if (!pin || pin.kind !== choice.kind) {
    return false;
  }
  if (pin.kind === "evidence" && choice.kind === "evidence") {
    return pin.evidenceId === choice.evidenceId;
  }
  if (pin.kind === "event" && choice.kind === "event") {
    return pin.atMs === choice.atMs && pin.eventKind === choice.eventKind;
  }
  return true;
};

interface ContextOptionView {
  choice: ContextChoiceView;
  item: SegmentContextValue;
}

async function nearestContextOptions(
  ctx: QueryCtx,
  segment: Doc<"sessionSegments">
): Promise<ContextOptionView[]> {
  const from = segment.startMs - CHOICES_BEFORE_MS;
  const to = segment.endMs + CHOICES_AFTER_MS;
  const inWindow = ({ atMs }: { atMs: number }) => atMs >= from && atMs <= to;
  const [allEvents, evidenceDocs] = await Promise.all([
    loadSessionEvents(ctx, segment.sessionId),
    loadSessionEvidence(ctx, segment.sessionId),
  ]);
  const events = linkableEvents(allEvents);
  const evidence = evidenceDocs
    .filter((doc) => doc.kind === "screenshot" && doc.status === "available")
    .map((doc) => toLinkableEvidence(doc, doc._id));
  const explicitKeys = new Set(
    events.flatMap(({ evidenceClientKey }) => evidenceClientKey ?? [])
  );
  const options: ContextOptionView[] = [
    ...events.filter(inWindow).map((event) => ({
      choice: {
        atMs: event.atMs,
        eventKind: event.kind,
        kind: "event" as const,
      },
      item: describeEvent(event, evidence),
    })),
    ...evidence
      .filter((shown) => inWindow(shown) && !explicitKeys.has(shown.clientKey))
      .flatMap((shown) =>
        shown.id
          ? [
              {
                choice: { evidenceId: shown.id, kind: "evidence" as const },
                item: describeEvidence(shown, events),
              },
            ]
          : []
      ),
  ];
  return options
    .sort(
      (a, b) =>
        Math.abs(a.item.atMs - segment.startMs) -
        Math.abs(b.item.atMs - segment.startMs)
    )
    .slice(0, MAX_CONTEXT_CHOICES)
    .sort((a, b) => a.item.atMs - b.item.atMs);
}

export const contextChoices = internalQuery({
  args: { actor: sessionActorValidator, segmentId: v.string() },
  handler: async (ctx, args) => {
    const { child: segment } = await loadSessionChild(ctx, {
      access: "write",
      actor: args.actor,
      id: args.segmentId,
      table: "sessionSegments",
    });
    const pin = segment.contextCorrection?.choice;
    const nearest = await nearestContextOptions(ctx, segment);
    return {
      options: nearest.map((option) => ({
        ...option,
        selected: isSelected(option.choice, pin),
      })),
    };
  },
});
