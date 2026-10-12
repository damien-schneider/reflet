import { v } from "convex/values";
import { internalMutation } from "../../_generated/server";
import { loadSession, sessionActorValidator } from "../access";
import { requestAnalysis } from "../ai/analysis_request";
import { shapeAnalysisStatus } from "../views/summary";

export const analyze = internalMutation({
  args: { actor: sessionActorValidator, sessionId: v.string() },
  handler: async (ctx, args) => {
    const session = await loadSession(ctx, {
      access: "write",
      actor: args.actor,
      sessionId: args.sessionId,
    });
    await requestAnalysis(ctx, session);
    const analyzed = await ctx.db.get(session._id);
    if (!analyzed) {
      throw new Error("Session vanished during the analysis request");
    }
    return { analysis: shapeAnalysisStatus(analyzed) };
  },
});
