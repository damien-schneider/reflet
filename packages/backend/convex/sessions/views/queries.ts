import { v } from "convex/values";
import type { Id } from "../../_generated/dataModel";
import { internalQuery, type QueryCtx } from "../../_generated/server";
import { authComponent } from "../../auth/auth";
import { loadSession, sessionActorValidator } from "../access";
import {
  isAnalysisConfigured,
  isTranscriptionConfigured,
} from "../ai/configuration";
import { SESSION_LIMITS, SESSION_LIST_LIMIT } from "../constants";
import {
  loadContinuation,
  loadContributedEvidence,
  loadHistory,
  shapeProposalList,
} from "./continuity";
import {
  loadSessionEvents,
  loadSessionEvidence,
  shapeEvidence,
  shapeHandoff,
  shapeMarks,
  shapeSegments,
} from "./detail";
import { shapeSessionSummary } from "./summary";

export const identity = internalQuery({
  args: { actor: sessionActorValidator },
  handler: async (ctx, { actor }) => {
    const organization = await ctx.db.get(actor.organizationId);
    if (!organization) {
      throw new Error("Organization not found");
    }
    const user = await authComponent.getAnyUserById(ctx, actor.userId);
    return {
      analysisConfigured: isAnalysisConfigured(),
      limits: SESSION_LIMITS,
      organizationId: organization._id,
      organizationName: organization.name,
      transcriptionConfigured: isTranscriptionConfigured(),
      user: {
        email: user?.email || null,
        id: actor.userId,
        name: user?.name || null,
      },
    };
  },
});

export const list = internalQuery({
  args: { actor: sessionActorValidator },
  handler: async (ctx, { actor }) => {
    const [mine, shared] = await Promise.all([
      ctx.db
        .query("sessions")
        .withIndex("by_org_author", (q) =>
          q
            .eq("organizationId", actor.organizationId)
            .eq("authorId", actor.userId)
        )
        .order("desc")
        .take(SESSION_LIST_LIMIT * 2),
      ctx.db
        .query("sessions")
        .withIndex("by_org_visibility", (q) =>
          q.eq("organizationId", actor.organizationId).eq("visibility", "team")
        )
        .order("desc")
        .take(SESSION_LIST_LIMIT * 2),
    ]);
    const byId = new Map(
      [...mine, ...shared]
        .filter((session) => session.deletedAt === undefined)
        .map((session) => [session._id, session])
    );
    const newest = [...byId.values()]
      .sort((a, b) => b.startedAt - a.startedAt)
      .slice(0, SESSION_LIST_LIMIT);
    return {
      sessions: await Promise.all(
        newest.map((session) => shapeSessionSummary(ctx, { actor, session }))
      ),
    };
  },
});

const loadSessionRecords = (ctx: QueryCtx, sessionId: Id<"sessions">) =>
  Promise.all([
    loadSessionEvents(ctx, sessionId),
    loadSessionEvidence(ctx, sessionId),
    ctx.db
      .query("sessionSegments")
      .withIndex("by_session_start", (q) => q.eq("sessionId", sessionId))
      .collect(),
    ctx.db
      .query("sessionProposals")
      .withIndex("by_session", (q) => q.eq("sessionId", sessionId))
      .collect(),
    ctx.db
      .query("sessionHandoffs")
      .withIndex("by_session", (q) => q.eq("sessionId", sessionId))
      .collect(),
  ]);

export const detail = internalQuery({
  args: { actor: sessionActorValidator, sessionId: v.string() },
  handler: async (ctx, { actor, sessionId }) => {
    const session = await loadSession(ctx, {
      access: "read",
      actor,
      sessionId,
    });
    const [events, evidence, segments, proposals, handoffs] =
      await loadSessionRecords(ctx, session._id);
    const [summary, proposalViews, continuation, history, contributedEvidence] =
      await Promise.all([
        shapeSessionSummary(ctx, { actor, session }),
        shapeProposalList(ctx, { actor, handoffs, proposals, session }),
        loadContinuation(ctx, { actor, session }),
        loadHistory(ctx, { actor, proposals }),
        loadContributedEvidence(ctx, { actor, proposals }),
      ]);
    return {
      continuation,
      contributedEvidence,
      evidence: await Promise.all(
        evidence.map((item) => shapeEvidence(ctx, item))
      ),
      handoffs: handoffs
        .sort((a, b) => b.createdAt - a.createdAt)
        .map(shapeHandoff),
      history,
      marks: shapeMarks(events),
      proposals: proposalViews,
      segments: shapeSegments({ events, evidence, segments }),
      session: {
        ...summary,
        canEdit: summary.isMine,
        gaps: session.gaps,
        startUrl: session.startUrl ?? null,
      },
    };
  },
});
