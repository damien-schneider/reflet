/**
 * Revenue integration — daily revenue snapshots for CEO agent reports and dashboards.
 *
 * Captures MRR, ARR, active subscriptions, and churn from Stripe.
 * Feeds snapshots to dashboard and creates revenue alerts on significant changes.
 */

import { v } from "convex/values";
import Stripe from "stripe";
import { internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import type { ActionCtx } from "../_generated/server";
import {
  internalAction,
  internalMutation,
  internalQuery,
} from "../_generated/server";

// ============================================
// STRIPE METRICS HELPER
// ============================================

/**
 * Fetch subscription metrics from Stripe for an organization.
 * Calculates MRR, ARR, active subscription count, and churn rate.
 */
const getStripeMetrics = async (
  stripeSecretKey: string
): Promise<{
  mrr: number;
  arr: number;
  activeSubscriptions: number;
  newSubscriptions: number;
  cancelledSubscriptions: number;
  churnRate: number;
}> => {
  const stripe = new Stripe(stripeSecretKey);

  // List active subscriptions
  const subscriptions = await stripe.subscriptions.list({
    status: "active",
    limit: 100,
  });

  // Calculate MRR from subscription items
  let mrr = 0;
  const activeCount = subscriptions.data.length;

  for (const sub of subscriptions.data) {
    for (const item of sub.items.data) {
      const amount = item.price?.unit_amount ?? 0;
      const interval = item.price?.recurring?.interval;

      if (interval === "month") {
        mrr += amount;
      } else if (interval === "year") {
        mrr += Math.round(amount / 12);
      }
    }
  }

  mrr = Math.round(mrr) / 100; // Convert cents to dollars
  const arr = mrr * 12; // Annual recurring revenue

  // Get cancelled subscriptions in the last 30 days
  const thirtyDaysAgo = Math.floor(Date.now() / 1000) - 30 * 24 * 60 * 60;
  const cancelledSubs = await stripe.subscriptions.list({
    status: "canceled",
    created: { gte: thirtyDaysAgo },
    limit: 100,
  });

  const cancelledCount = cancelledSubs.data.length;

  // Get new subscriptions in the last 30 days
  const newSubs = await stripe.subscriptions.list({
    created: { gte: thirtyDaysAgo },
    limit: 100,
  });

  const newCount = newSubs.data.length;

  // Calculate 30-day churn rate
  const churnRate =
    activeCount > 0
      ? (cancelledCount / (activeCount + cancelledCount)) * 100
      : 0;

  return {
    mrr,
    arr,
    activeSubscriptions: activeCount,
    newSubscriptions: newCount,
    cancelledSubscriptions: cancelledCount,
    churnRate: Math.round(churnRate * 100) / 100, // Round to 2 decimals
  };
};

// ============================================
// INTERNAL QUERIES
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
// INTERNAL MUTATIONS
// ============================================

/**
 * Insert a new revenue snapshot into the database.
 */
export const createSnapshot = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    snapshotDate: v.string(),
    mrr: v.number(),
    arr: v.number(),
    activeSubscriptions: v.number(),
    newSubscriptions: v.number(),
    cancelledSubscriptions: v.number(),
    churnRate: v.number(),
    createdAt: v.number(),
  },
  returns: v.id("autopilotRevenueSnapshots"),
  handler: async (ctx, args) => {
    // Deduplicate: check if snapshot already exists for this date
    const existing = await ctx.db
      .query("autopilotRevenueSnapshots")
      .withIndex("by_org_date", (q) =>
        q
          .eq("organizationId", args.organizationId)
          .eq("snapshotDate", args.snapshotDate)
      )
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        mrr: args.mrr,
        arr: args.arr,
        activeSubscriptions: args.activeSubscriptions,
        newSubscriptions: args.newSubscriptions,
        cancelledSubscriptions: args.cancelledSubscriptions,
        churnRate: args.churnRate,
      });
      return existing._id;
    }

    return await ctx.db.insert("autopilotRevenueSnapshots", {
      organizationId: args.organizationId,
      snapshotDate: args.snapshotDate,
      mrr: args.mrr,
      arr: args.arr,
      activeSubscriptions: args.activeSubscriptions,
      newSubscriptions: args.newSubscriptions,
      cancelledSubscriptions: args.cancelledSubscriptions,
      churnRate: args.churnRate,
      createdAt: args.createdAt,
    });
  },
});

// ============================================
// HELPER QUERIES (for actions)
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

// ============================================
// INTERNAL ACTIONS
// ============================================

const SIGNIFICANT_CHANGE_THRESHOLD = 10;

const detectRevenueAlerts = async (
  ctx: ActionCtx,
  organizationId: Id<"organizations">,
  metrics: { mrr: number; activeSubscriptions: number; churnRate: number },
  prev: { mrr: number }
) => {
  const mrrChangePercent =
    prev.mrr > 0 ? Math.abs((metrics.mrr - prev.mrr) / prev.mrr) * 100 : 0;

  if (mrrChangePercent <= SIGNIFICANT_CHANGE_THRESHOLD) {
    return;
  }

  const direction = metrics.mrr > prev.mrr ? "increase" : "decrease";
  const changeAmount = Math.round(Math.abs(metrics.mrr - prev.mrr) * 100) / 100;

  await ctx.runMutation(internal.autopilot.documents.createDocument, {
    organizationId,
    type: "report",
    title: `Revenue ${direction}: ${direction === "increase" ? "+" : "-"}$${changeAmount}`,
    content: `Daily revenue snapshot detected a significant change in MRR. Previous: $${prev.mrr}, Current: $${metrics.mrr}. Active subscriptions: ${metrics.activeSubscriptions}. Churn rate: ${metrics.churnRate}%.`,
    sourceAgent: "system",
    needsReview: true,
    reviewType: "revenue_alert",
    tags: ["revenue"],
  });

  await ctx.runMutation(internal.autopilot.tasks.logActivity, {
    organizationId,
    agent: "system",
    level: "warning",
    message: `Revenue alert: MRR ${direction} by ${Math.round(mrrChangePercent * 10) / 10}%`,
    details: `Previous: $${prev.mrr}, Current: $${metrics.mrr}`,
  });
};

/**
 * Capture a daily revenue snapshot for an organization.
 * Fetches Stripe metrics, stores snapshot, and creates alerts on significant changes.
 */
export const captureRevenueSnapshot = internalAction({
  args: { organizationId: v.id("organizations") },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Get the organization's billing info to find Stripe customer ID
    const org = await ctx.runQuery(internal.autopilot.tasks.getOrganization, {
      id: args.organizationId,
    });

    if (!org) {
      throw new Error(`Organization ${args.organizationId} not found`);
    }

    // Check if organization has a subscription
    const hasSub = await ctx.runQuery(
      internal.autopilot.revenue.hasSubscription,
      { organizationId: args.organizationId }
    );

    if (!hasSub) {
      // No subscription found, skip snapshot
      await ctx.runMutation(internal.autopilot.tasks.logActivity, {
        organizationId: args.organizationId,
        agent: "system",
        level: "info",
        message:
          "No subscription found for organization — skipping revenue snapshot",
      });
      return null;
    }

    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeSecretKey) {
      throw new Error("STRIPE_SECRET_KEY environment variable not set");
    }

    try {
      // Fetch metrics from Stripe
      const metrics = await getStripeMetrics(stripeSecretKey);

      // Create snapshot entry (skip if one already exists for today)
      const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD format

      const existingSnapshot = await ctx.runQuery(
        internal.autopilot.revenue.getSnapshotByDate,
        { organizationId: args.organizationId, snapshotDate: today }
      );

      if (!existingSnapshot) {
        await ctx.runMutation(internal.autopilot.revenue.createSnapshot, {
          organizationId: args.organizationId,
          snapshotDate: today,
          mrr: metrics.mrr,
          arr: metrics.arr,
          activeSubscriptions: metrics.activeSubscriptions,
          newSubscriptions: metrics.newSubscriptions,
          cancelledSubscriptions: metrics.cancelledSubscriptions,
          churnRate: metrics.churnRate,
          createdAt: Date.now(),
        });
      }

      // Get previous snapshot to detect significant changes
      const previousSnapshot = await ctx.runQuery(
        internal.autopilot.revenue.getSnapshotHistory,
        { organizationId: args.organizationId, limit: 2 }
      );

      // Compare with previous snapshot (if exists) to detect significant changes
      if (previousSnapshot.length > 1) {
        await detectRevenueAlerts(
          ctx,
          args.organizationId,
          metrics,
          previousSnapshot[1]
        );
      }

      // Log successful snapshot
      await ctx.runMutation(internal.autopilot.tasks.logActivity, {
        organizationId: args.organizationId,
        agent: "system",
        level: "success",
        message: "Revenue snapshot captured",
        details: `MRR: $${metrics.mrr}, ARR: $${metrics.arr}, Active: ${metrics.activeSubscriptions}, Churn: ${metrics.churnRate}%`,
      });
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Unknown error";

      await ctx.runMutation(internal.autopilot.tasks.logActivity, {
        organizationId: args.organizationId,
        agent: "system",
        level: "error",
        message: "Failed to capture revenue snapshot",
        details: msg,
      });

      throw error;
    }

    return null;
  },
});

/**
 * Cron action to run revenue snapshots for all enabled organizations.
 * Called daily by the scheduler.
 */
export const runRevenueSnapshotCron = internalAction({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    // Get all organizations with autopilot enabled
    const enabledOrgIds = await ctx.runQuery(
      internal.autopilot.revenue.getEnabledOrgIds,
      {}
    );

    if (enabledOrgIds.length === 0) {
      return null;
    }

    let successCount = 0;
    let failureCount = 0;

    for (const organizationId of enabledOrgIds) {
      try {
        await ctx.runAction(internal.autopilot.revenue.captureRevenueSnapshot, {
          organizationId,
        });
        successCount += 1;
      } catch (error) {
        const msg = error instanceof Error ? error.message : "Unknown error";
        failureCount += 1;

        await ctx.runMutation(internal.autopilot.tasks.logActivity, {
          organizationId,
          agent: "system",
          level: "error",
          message: "Revenue snapshot cron failed",
          details: msg,
        });
      }
    }

    if (failureCount > 0) {
      throw new Error(
        `Revenue snapshot cron completed with ${failureCount} failures (${successCount} successes)`
      );
    }

    return null;
  },
});
