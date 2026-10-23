import type { Doc } from "../../../_generated/dataModel";
import type { QueryCtx } from "../../../_generated/server";
import { findContinuation } from "../../intentions/contributions";
import { segmentSpeech } from "../../speakers/attribution";
import { loadSpeakerTurns } from "../../speakers/turns";
import type { ContinuedIntentionSource } from "./prompt";

export interface ContinuationTarget {
  contribution: Doc<"sessionContributions">;
  source: ContinuedIntentionSource;
}

export async function loadContinuationTarget(
  ctx: QueryCtx,
  session: Doc<"sessions">
): Promise<ContinuationTarget | null> {
  const contribution = await findContinuation(ctx, session);
  if (!contribution || contribution.detachedAt !== undefined) {
    return null;
  }
  const intention = await ctx.db.get(contribution.intentionId);
  const earlier = intention ? await ctx.db.get(intention.sessionId) : null;
  if (!(intention && earlier) || earlier.deletedAt !== undefined) {
    return null;
  }
  const earlierTurns = await loadSpeakerTurns(ctx, earlier._id);
  const earlierQuotes: ContinuedIntentionSource["earlierQuotes"] = [];
  for (const segmentId of intention.segmentIds) {
    const segment = await ctx.db.get(segmentId);
    if (segment) {
      earlierQuotes.push({
        speech: segmentSpeech(segment, earlierTurns),
        startMs: segment.startMs,
        text: segment.text,
      });
    }
  }
  return {
    contribution,
    source: {
      answers: contribution.answers,
      earlierQuotes: earlierQuotes.sort((a, b) => a.startMs - b.startMs),
      earlierTitle: earlier.title,
      intention,
      question: contribution.question ?? null,
    },
  };
}
