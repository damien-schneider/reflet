import { v } from "convex/values";
import { internalQuery, query } from "../_generated/server";
import { requireOrgAdmin } from "../shared/access";

const MAX_DELIVERIES_LISTED = 50;

export const list = query({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    await requireOrgAdmin(ctx, args.organizationId, "view webhooks");
    const webhooks = await ctx.db
      .query("organizationWebhooks")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .collect();
    return webhooks.map(({ secret: _secret, ...webhook }) => webhook);
  },
});

export const listDeliveries = query({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    await requireOrgAdmin(ctx, args.organizationId, "view webhooks");
    return await ctx.db
      .query("webhookDeliveries")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .order("desc")
      .take(MAX_DELIVERIES_LISTED);
  },
});

export const getDeliveryTarget = internalQuery({
  args: { deliveryId: v.id("webhookDeliveries") },
  handler: async (ctx, args) => {
    const delivery = await ctx.db.get(args.deliveryId);
    if (!delivery) {
      return null;
    }
    const webhook = await ctx.db.get(delivery.webhookId);
    if (!webhook) {
      return null;
    }
    return { delivery, webhook };
  },
});
