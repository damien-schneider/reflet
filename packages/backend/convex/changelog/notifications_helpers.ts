import { v } from "convex/values";
import { internalMutation, internalQuery } from "../_generated/server";

export const getRelease = internalQuery({
  args: {
    releaseId: v.id("releases"),
  },
  handler: async (ctx, args) => await ctx.db.get(args.releaseId),
});

export const getOrganization = internalQuery({
  args: {
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => await ctx.db.get(args.organizationId),
});

/** A release sends at most one subscriber blast, ever. */
export const claimReleaseNotification = internalMutation({
  args: {
    releaseId: v.id("releases"),
  },
  handler: async (ctx, args) => {
    const release = await ctx.db.get(args.releaseId);
    if (!release || release.notifiedAt !== undefined) {
      return false;
    }

    await ctx.db.patch(args.releaseId, { notifiedAt: Date.now() });
    return true;
  },
});
