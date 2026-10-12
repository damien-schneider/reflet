import { ConvexError } from "convex/values";
import { internal } from "../../_generated/api";
import type { Doc, Id } from "../../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../../_generated/server";
import { rateLimiter } from "../../shared/rate_limits";
import { SESSION_NOT_FOUND } from "../constants";
import { ANALYSIS_NOT_CONFIGURED, isAnalysisConfigured } from "./configuration";

const ANALYSIS_STALE_AFTER_MS = 10 * 60_000;
const HTTP_TOO_MANY_REQUESTS = 429;
const HTTP_SERVICE_UNAVAILABLE = 503;
const HTTP_NOT_FOUND = 404;
const ANALYSES_RATE_LIMITED =
  "Too many analyses in a short time. Try again in a few minutes.";

type SessionAnalysis = Doc<"sessions">["analysis"];

const ensureAnalysisAllowed = async (
  ctx: MutationCtx,
  authorId: string
): Promise<void> => {
  if (!isAnalysisConfigured()) {
    throw new ConvexError({
      error: ANALYSIS_NOT_CONFIGURED,
      status: HTTP_SERVICE_UNAVAILABLE,
    });
  }
  const { ok } = await rateLimiter.limit(ctx, "sessionAnalysisPerUser", {
    key: authorId,
  });
  if (!ok) {
    throw new ConvexError({
      error: ANALYSES_RATE_LIMITED,
      status: HTTP_TOO_MANY_REQUESTS,
    });
  }
};

export const hasUnsettledTranscription = async (
  ctx: QueryCtx,
  sessionId: Id<"sessions">
): Promise<boolean> => {
  const segments = await ctx.db
    .query("sessionSegments")
    .withIndex("by_session_start", (q) => q.eq("sessionId", sessionId))
    .collect();
  return segments.some(
    ({ transcription }) =>
      transcription.state === "pending" || transcription.state === "running"
  );
};

const analysisAs = (
  analysis: SessionAnalysis,
  state: "waiting" | "running",
  runId: string | undefined
): SessionAnalysis => ({
  analyzedRevision: analysis.analyzedRevision,
  proposalCount: analysis.proposalCount,
  runId,
  state,
  updatedAt: Date.now(),
});

const startAnalysisRun = async (
  ctx: MutationCtx,
  session: Doc<"sessions">
): Promise<void> => {
  const runId = crypto.randomUUID();
  await ctx.db.patch(session._id, {
    analysis: analysisAs(session.analysis, "running", runId),
  });
  await ctx.scheduler.runAfter(
    0,
    internal.sessions.ai.analysis_run.runAnalysis,
    { runId, sessionId: session._id }
  );
};

export async function requestAnalysis(
  ctx: MutationCtx,
  session: Doc<"sessions">
): Promise<void> {
  const { state, updatedAt = 0 } = session.analysis;
  const runIsFresh = Date.now() - updatedAt < ANALYSIS_STALE_AFTER_MS;
  if (state === "waiting" || (state === "running" && runIsFresh)) {
    return;
  }
  await ensureAnalysisAllowed(ctx, session.authorId);
  if (await hasUnsettledTranscription(ctx, session._id)) {
    await ctx.db.patch(session._id, {
      analysis: analysisAs(session.analysis, "waiting", session.analysis.runId),
    });
    return;
  }
  await startAnalysisRun(ctx, session);
}

export async function startWaitingAnalysis(
  ctx: MutationCtx,
  sessionId: Id<"sessions">
): Promise<void> {
  const session = await ctx.db.get(sessionId);
  if (
    session?.analysis.state !== "waiting" ||
    session.deletedAt !== undefined
  ) {
    return;
  }
  if (await hasUnsettledTranscription(ctx, sessionId)) {
    return;
  }
  await startAnalysisRun(ctx, session);
}

export async function requestRefinement(
  ctx: MutationCtx,
  options: { proposal: Doc<"sessionProposals">; text: string }
): Promise<void> {
  const { proposal, text } = options;
  const session = await ctx.db.get(proposal.sessionId);
  if (!session || session.deletedAt !== undefined) {
    throw new ConvexError({ error: SESSION_NOT_FOUND, status: HTTP_NOT_FOUND });
  }
  await ensureAnalysisAllowed(ctx, session.authorId);
  const runId = crypto.randomUUID();
  const now = Date.now();
  const [lastClarification] = proposal.clarifications.slice(-1);
  await ctx.db.patch(proposal._id, {
    clarifications:
      lastClarification?.text === text
        ? proposal.clarifications
        : [...proposal.clarifications, { at: now, text }],
    humanTouchedAt: now,
    refinement: {
      baseRevision: proposal.revision,
      runId,
      state: "running",
      text,
    },
    updatedAt: now,
  });
  await ctx.scheduler.runAfter(
    0,
    internal.sessions.ai.analysis_run.runRefinement,
    { proposalId: proposal._id, runId }
  );
}
