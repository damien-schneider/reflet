import { v } from "convex/values";
import { internalMutation } from "../_generated/server";

export const unsetSetupFields = internalMutation({
  args: {},
  handler: async (ctx) => {
    const organizations = await ctx.db.query("organizations").collect();
    let count = 0;
    for (const organization of organizations) {
      if (
        organization.setupCompleted !== undefined ||
        organization.setupMethod !== undefined
      ) {
        await ctx.db.patch(organization._id, {
          setupCompleted: undefined,
          setupMethod: undefined,
        });
        count += 1;
      }
    }
    return count;
  },
  returns: v.number(),
});
