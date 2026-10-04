import { defineTable } from "convex/server";
import { v } from "convex/values";

export const billingTables = {
  subscriptionCancellations: defineTable({
    comment: v.optional(v.string()),
    endedAt: v.optional(v.number()),
    endsAt: v.optional(v.number()),
    feedback: v.optional(v.string()),
    organizationId: v.id("organizations"),
    reason: v.optional(v.string()),
    requestedAt: v.number(),
    resumedAt: v.optional(v.number()),
    stripeSubscriptionId: v.string(),
  })
    .index("by_organization", ["organizationId"])
    .index("by_stripe_subscription", ["stripeSubscriptionId"]),
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
