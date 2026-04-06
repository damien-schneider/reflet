/**
 * Revenue queries — read-only functions for revenue snapshots and stats.
 *
 * Used by actions in revenue_actions.ts and by dashboard/reporting features.
 */

import { v } from "convex/values";
import { internalQuery } from "../_generated/server";

// ============================================
// SNAPSHOT QUERIES
// ============================================

/**
 * Get the most recent revenue snapshot for an organization.
 */
export const getLatestSnapshot = internalQuery({
  args: { organizationId: v.id("organizations") },
  returns: v.union(
    v.object({
      _id: v.id("autopilotRevenueSnapshots"),
      _creationTime: v.number(),
      organizationId: v.id("organizations"),
      snapshotDate: v.string(),
      mrr: v.number(),
      arr: v.number(),
      activeSubscriptions: v.number(),
      newSubscriptions: v.optional(v.number()),
      cancelledSubscriptions: v.optional(v.number()),
      churnRate: v.optional(v.number()),
      createdAt: v.number(),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const snapshot = await ctx.db
      .query("autopilotRevenueSnapshots")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .order("desc")
      .first();

    return snapshot ?? null;
  },
});

/**
 * Get revenue snapshots for an organization within a date range.
 * Ordered by date descending (most recent first).
 */
export const getSnapshotHistory = internalQuery({
  args: {
    organizationId: v.id("organizations"),
    limit: v.optional(v.number()),
  },
  returns: v.array(
    v.object({
      _id: v.id("autopilotRevenueSnapshots"),
      _creationTime: v.number(),
      organizationId: v.id("organizations"),
      snapshotDate: v.string(),
      mrr: v.number(),
      arr: v.number(),
      activeSubscriptions: v.number(),
      newSubscriptions: v.optional(v.number()),
      cancelledSubscriptions: v.optional(v.number()),
      churnRate: v.optional(v.number()),
      createdAt: v.number(),
    })
  ),
  handler: async (ctx, args) => {
    const limit = args.limit ?? 30;

    const snapshots = await ctx.db
      .query("autopilotRevenueSnapshots")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .order("desc")
      .take(limit);

    return snapshots;
  },
});

/**
 * Get a specific snapshot by org and date (for deduplication).
 */
export const getSnapshotByDate = internalQuery({
  args: {
    organizationId: v.id("organizations"),
    snapshotDate: v.string(),
  },
  handler: async (ctx, args) => {
    const snapshots = await ctx.db
      .query("autopilotRevenueSnapshots")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .collect();

    return snapshots.find((s) => s.snapshotDate === args.snapshotDate) ?? null;
  },
});

// ============================================
// COMPUTED STATS
// ============================================

/**
 * Get computed revenue stats for the dashboard.
 * Compares latest snapshot with previous to calculate trends.
 */
export const getRevenueStats = internalQuery({
  args: { organizationId: v.id("organizations") },
  returns: v.object({
    currentMrr: v.number(),
    mrrChange: v.number(),
    mrrChangePercent: v.number(),
    arr: v.number(),
    activeSubscriptions: v.number(),
    churnRate: v.number(),
    trend: v.union(v.literal("up"), v.literal("down"), v.literal("stable")),
  }),
  handler: async (ctx, args) => {
    const snapshots = await ctx.db
      .query("autopilotRevenueSnapshots")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .order("desc")
      .take(2);

    if (snapshots.length === 0) {
      return {
        currentMrr: 0,
        mrrChange: 0,
        mrrChangePercent: 0,
        arr: 0,
        activeSubscriptions: 0,
        churnRate: 0,
        trend: "stable" as const,
      };
    }

    const latest = snapshots[0];
    const previous = snapshots[1];

    const mrrChange = previous ? latest.mrr - previous.mrr : 0;
    const mrrChangePercent =
      previous && previous.mrr > 0
        ? Math.round((mrrChange / previous.mrr) * 10_000) / 100
        : 0;

    let trend: "up" | "down" | "stable" = "stable";
    if (mrrChange > 0) {
      trend = "up";
    } else if (mrrChange < 0) {
      trend = "down";
    }

    return {
      currentMrr: latest.mrr,
      mrrChange: Math.round(mrrChange * 100) / 100,
      mrrChangePercent,
      arr: latest.arr,
      activeSubscriptions: latest.activeSubscriptions,
      churnRate: latest.churnRate ?? 0,
      trend,
    };
  },
});

// ============================================
// HELPER QUERIES (used by actions)
// ============================================

/**
 * Check if an organization has a subscription record.
 */
export const hasSubscription = internalQuery({
  args: { organizationId: v.id("organizations") },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const subscription = await ctx.db
      .query("subscriptions")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .first();
    return subscription !== null;
  },
});

/**
 * Get all enabled autopilot organization IDs.
 */
export const getEnabledOrgIds = internalQuery({
  args: {},
  returns: v.array(v.id("organizations")),
  handler: async (ctx) => {
    const configs = await ctx.db.query("autopilotConfig").collect();
    return configs
      .filter((config) => (config.autonomyMode ?? "supervised") !== "stopped")
      .map((config) => config.organizationId);
  },
});
