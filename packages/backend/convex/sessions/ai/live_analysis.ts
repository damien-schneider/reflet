import { v } from "convex/values";
import { internal } from "../../_generated/api";
import type { Doc, Id } from "../../_generated/dataModel";
import { internalMutation, type MutationCtx } from "../../_generated/server";
import {
  hasRunCoveringSession,
  skipsAnalysis,
  startAnalysisRun,
} from "./analysis_request";
import { isAnalysisConfigured } from "./configuration";

const LIVE_ANALYSIS_GAP_MS = 15_000;

const isStillRecording = (
  session: Doc<"sessions"> | null
): session is Doc<"sessions"> =>
  session !== null &&
  session.deletedAt === undefined &&
  session.collection !== "ended" &&
  session.continues === undefined;

export async function followRecording(
  ctx: MutationCtx,
  sessionId: Id<"sessions">
): Promise<void> {
  const session = await ctx.db.get(sessionId);
  if (
    !(isStillRecording(session) && isAnalysisConfigured()) ||
    skipsAnalysis(session)
  ) {
    return;
  }
  const { analysis, transcriptRevision } = session;
  const hasUnreadText = (analysis.analyzedRevision ?? 0) < transcriptRevision;
  if (
    !hasUnreadText ||
    analysis.state === "waiting" ||
    hasRunCoveringSession(session)
  ) {
    return;
  }
  const waitMs = (analysis.updatedAt ?? 0) + LIVE_ANALYSIS_GAP_MS - Date.now();
  if (waitMs > 0) {
    await ctx.scheduler.runAfter(
      waitMs,
      internal.sessions.ai.live_analysis.followRecordingLater,
      { sessionId }
    );
    return;
  }
  await startAnalysisRun(ctx, session);
}

export const followRecordingLater = internalMutation({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx, { sessionId }) => {
    await followRecording(ctx, sessionId);
    return null;
  },
  returns: v.null(),
});
