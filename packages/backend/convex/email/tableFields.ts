import { defineTable } from "convex/server";
import { v } from "convex/values";

export const emailTables = {
  emailSuppressions: defineTable({
    email: v.string(),
    reason: v.union(
      v.literal("hard_bounce"),
      v.literal("complaint"),
      v.literal("manual")
    ),
    originalEventType: v.string(),
    suppressedAt: v.number(),
  }).index("by_email", ["email"]),
};
