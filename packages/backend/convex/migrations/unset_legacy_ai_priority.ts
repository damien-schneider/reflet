import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import { internalMutation } from "../_generated/server";

export const unsetLegacyAiPriority = internalMutation({
  args: { paginationOpts: paginationOptsValidator },
  handler: async (ctx, args) => {
    const page = await ctx.db.query("feedback").paginate(args.paginationOpts);
    let count = 0;
    for (const feedback of page.page) {
      if (
        feedback.aiPriority !== undefined ||
        feedback.aiPriorityReasoning !== undefined ||
        feedback.aiDifficultyScore !== undefined ||
        feedback.aiDifficultyReasoning !== undefined ||
        feedback.aiDifficultyGeneratedAt !== undefined
      ) {
        await ctx.db.patch(feedback._id, {
          aiDifficultyGeneratedAt: undefined,
          aiDifficultyReasoning: undefined,
          aiDifficultyScore: undefined,
          aiPriority: undefined,
          aiPriorityReasoning: undefined,
        });
        count += 1;
      }
    }
    return {
      continueCursor: page.continueCursor,
      count,
      isDone: page.isDone,
    };
  },
  returns: v.object({
    continueCursor: v.string(),
    count: v.number(),
    isDone: v.boolean(),
  }),
});
