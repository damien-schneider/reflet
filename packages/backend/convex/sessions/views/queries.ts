import { v } from "convex/values";
import { internalQuery } from "../../_generated/server";
import { authComponent } from "../../auth/auth";
import { loadSession, sessionActorValidator } from "../access";
import {
  isAnalysisConfigured,
  isTranscriptionConfigured,
} from "../ai/configuration";
import { SESSION_LIMITS, SESSION_LIST_LIMIT } from "../constants";
import {
  loadSessionEvents,
  loadSessionEvidence,
  shapeEvidence,
  shapeHandoff,
  shapeMarks,
  shapeProposal,
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

export const detail = internalQuery({
  args: { actor: sessionActorValidator, sessionId: v.string() },
  handler: async (ctx, { actor, sessionId }) => {
    const session = await loadSession(ctx, {
      access: "read",
      actor,
      sessionId,
    });
    const [events, evidence, segments, proposals, handoffs] = await Promise.all(
      [
        loadSessionEvents(ctx, session._id),
        loadSessionEvidence(ctx, session._id),
        ctx.db
          .query("sessionSegments")
          .withIndex("by_session_start", (q) => q.eq("sessionId", session._id))
          .collect(),
        ctx.db
          .query("sessionProposals")
          .withIndex("by_session", (q) => q.eq("sessionId", session._id))
          .collect(),
        ctx.db
          .query("sessionHandoffs")
          .withIndex("by_session", (q) => q.eq("sessionId", session._id))
          .collect(),
      ]
    );
    const summary = await shapeSessionSummary(ctx, { actor, session });
    return {
      evidence: await Promise.all(
        evidence.map((item) => shapeEvidence(ctx, item))
      ),
      handoffs: handoffs
        .sort((a, b) => b.createdAt - a.createdAt)
        .map(shapeHandoff),
      marks: shapeMarks(events),
      proposals: proposals
        .sort((a, b) => a.createdAt - b.createdAt)
        .map((proposal) => shapeProposal(proposal, handoffs)),
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
