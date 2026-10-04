import { v } from "convex/values";
import { internalMutation } from "../_generated/server";

export const stripSurveyConditionalLogic = internalMutation({
  args: {},
  handler: async (ctx) => {
    let questionsStripped = 0;
    for (const question of await ctx.db.query("surveyQuestions").collect()) {
      if (question.conditionalLogic === undefined) {
        continue;
      }
      await ctx.db.patch(question._id, { conditionalLogic: undefined });
      questionsStripped++;
    }
    return { questionsStripped };
  },
  returns: v.object({ questionsStripped: v.number() }),
});
