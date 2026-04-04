import { defineTable } from "convex/server";
import { v } from "convex/values";
import { autonomyLevel, autonomyMode, codingAdapterType } from "./validators";

export const configTables = {
  autopilotConfig: defineTable({
    adapter: codingAdapterType,
    autonomyLevel,
    autoMergePRs: v.boolean(),
    ceoChatThreadId: v.optional(v.string()),
    costUsedTodayUsd: v.optional(v.number()),
    createdAt: v.number(),
    dailyCostCapUsd: v.optional(v.number()),
    emailBlocklist: v.optional(v.array(v.string())),
    emailDailyLimit: v.optional(v.number()),
    enabled: v.boolean(),
    intelligenceEnabled: v.optional(v.boolean()),
    pmEnabled: v.optional(v.boolean()),
    ctoEnabled: v.optional(v.boolean()),
    devEnabled: v.optional(v.boolean()),
    securityEnabled: v.optional(v.boolean()),
    architectEnabled: v.optional(v.boolean()),
    growthEnabled: v.optional(v.boolean()),
    supportEnabled: v.optional(v.boolean()),
    docsEnabled: v.optional(v.boolean()),
    salesEnabled: v.optional(v.boolean()),
    maxTasksPerDay: v.number(),
    organizationId: v.id("organizations"),
    orgEmailAddress: v.optional(v.string()),
    requireArchitectReview: v.boolean(),
    tasksResetAt: v.number(),
    tasksUsedToday: v.number(),
    updatedAt: v.number(),
    autonomyMode: v.optional(autonomyMode),
    stoppedAt: v.optional(v.number()),
    fullAutoDelay: v.optional(v.number()),
    autoMergeThreshold: v.optional(v.number()),
    maxPendingTasksPerAgent: v.optional(v.number()),
    maxPendingTasksTotal: v.optional(v.number()),
    // New initiative/signal/activation config fields
    maxActiveInitiatives: v.optional(v.number()),
    maxActiveStoriesPerInitiative: v.optional(v.number()),
    maxSignalsPerDay: v.optional(v.number()),
    activationOverrides: v.optional(v.string()),
  }).index("by_organization", ["organizationId"]),

  autopilotAdapterCredentials: defineTable({
    organizationId: v.id("organizations"),
    adapter: codingAdapterType,
    credentials: v.string(),
    isValid: v.boolean(),
    lastValidatedAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_organization", ["organizationId"])
    .index("by_org_adapter", ["organizationId", "adapter"]),
};
