import { v } from "convex/values";
import { internalQuery } from "./_generated/server";

export const isEmailSuppressed = internalQuery({
  args: { email: v.string() },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const suppression = await ctx.db
      .query("emailSuppressions")
      .withIndex("by_email", (q) => q.eq("email", args.email.toLowerCase()))
      .first();

    return suppression !== null;
  },
});
