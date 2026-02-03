import { v } from "convex/values";
import { internalQuery } from "./_generated/server";

/**
 * Get a release by ID (internal use only)
 */
export const getRelease = internalQuery({
  args: {
    releaseId: v.id("releases"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.releaseId);
  },
});

/**
 * Get an organization by ID (internal use only)
 */
export const getOrganization = internalQuery({
  args: {
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.organizationId);
  },
});
