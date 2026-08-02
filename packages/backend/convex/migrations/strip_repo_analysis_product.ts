import { v } from "convex/values";
import { internalMutation } from "../_generated/server";

export const stripProductAnalysis = internalMutation({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db.query("repoAnalysis").collect();

    const stale = rows.filter((row) => "productAnalysis" in row);
    await Promise.all(
      stale.map((row) => ctx.db.patch(row._id, { productAnalysis: undefined }))
    );

    return { scanned: rows.length, stripped: stale.length };
  },
  returns: v.object({ scanned: v.number(), stripped: v.number() }),
});
