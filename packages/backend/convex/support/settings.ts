import { v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { requireOrgAdmin } from "./access";

export const get = query({
  args: {
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    const org = await ctx.db.get(args.organizationId);
    if (!org) {
      return null;
    }

    return { supportEnabled: org.supportEnabled ?? false };
  },
  returns: v.union(v.object({ supportEnabled: v.boolean() }), v.null()),
});

export const update = mutation({
  args: {
    organizationId: v.id("organizations"),
    supportEnabled: v.boolean(),
  },
  handler: async (ctx, args) => {
    await requireOrgAdmin(ctx, args.organizationId, "update support settings");

    await ctx.db.patch(args.organizationId, {
      supportEnabled: args.supportEnabled,
    });

    return args.organizationId;
  },
  returns: v.id("organizations"),
});
