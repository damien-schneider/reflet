import { v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { findActivePublicApiKey } from "../feedback/api_auth";
import { requireOrgAdmin } from "../shared/access";

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

export const findOpenDeskByPublicKey = query({
  args: {
    publicKey: v.string(),
  },
  handler: async (ctx, args) => {
    const key = await findActivePublicApiKey(ctx, args.publicKey);
    if (!key) {
      return null;
    }

    const org = await ctx.db.get(key.organizationId);
    if (!org?.supportEnabled) {
      return null;
    }

    return { _id: org._id, name: org.name, slug: org.slug };
  },
  returns: v.union(
    v.object({
      _id: v.id("organizations"),
      name: v.string(),
      slug: v.string(),
    }),
    v.null()
  ),
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
