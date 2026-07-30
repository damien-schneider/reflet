import { defineTable } from "convex/server";
import { v } from "convex/values";

export const billingTables = {
  subscriptions: defineTable({
    cancelAtPeriodEnd: v.boolean(),
    createdAt: v.number(),
    currentPeriodEnd: v.optional(v.number()),
    currentPeriodStart: v.optional(v.number()),
    organizationId: v.id("organizations"),
    status: v.union(
      v.literal("active"),
      v.literal("trialing"),
      v.literal("past_due"),
      v.literal("canceled"),
      v.literal("unpaid"),
      v.literal("incomplete"),
      v.literal("incomplete_expired")
    ),
    stripeCustomerId: v.string(),
    stripePriceId: v.optional(v.string()),
    stripeSubscriptionId: v.string(),
    updatedAt: v.number(),
  })
    .index("by_organization", ["organizationId"])
    .index("by_stripe_customer", ["stripeCustomerId"])
    .index("by_stripe_subscription", ["stripeSubscriptionId"]),
};
