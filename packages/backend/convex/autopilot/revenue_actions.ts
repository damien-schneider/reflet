/**
 * Revenue actions — Stripe integration, snapshot creation, and cron jobs.
 *
 * Captures MRR, ARR, active subscriptions, and churn from Stripe.
 * Feeds snapshots to dashboard and creates revenue alerts on significant changes.
 */

import { v } from "convex/values";
import Stripe from "stripe";
import { internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import type { ActionCtx } from "../_generated/server";
import { internalAction, internalMutation } from "../_generated/server";

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
// SNAPSHOT MUTATION
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
// ALERT DETECTION
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
    type: "note",
    title: `Revenue ${direction}: ${direction === "increase" ? "+" : "-"}$${changeAmount}`,
    content: `Daily revenue snapshot detected a significant change in MRR. Previous: $${prev.mrr}, Current: $${metrics.mrr}. Active subscriptions: ${metrics.activeSubscriptions}. Churn rate: ${metrics.churnRate}%.`,
    sourceAgent: "system",
    needsReview: true,
    reviewType: "revenue_alert",
    tags: ["revenue"],
  });

  await ctx.runMutation(internal.autopilot.task_mutations.logActivity, {
    organizationId,
    agent: "system",
    level: "warning",
    message: `Revenue alert: MRR ${direction} by ${Math.round(mrrChangePercent * 10) / 10}%`,
    details: `Previous: $${prev.mrr}, Current: $${metrics.mrr}`,
  });
};

// ============================================
// ACTIONS
// ============================================

/**
 * Capture a daily revenue snapshot for an organization.
 * Fetches Stripe metrics, stores snapshot, and creates alerts on significant changes.
 */
export const captureRevenueSnapshot = internalAction({
  args: { organizationId: v.id("organizations") },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Get the organization's billing info to find Stripe customer ID
    const org = await ctx.runQuery(
      internal.autopilot.task_queries.getOrganization,
      {
        id: args.organizationId,
      }
    );

    if (!org) {
      throw new Error(`Organization ${args.organizationId} not found`);
    }

    // Check if organization has a subscription
    const hasSub = await ctx.runQuery(
      internal.autopilot.revenue_queries.hasSubscription,
      { organizationId: args.organizationId }
    );

    if (!hasSub) {
      // No subscription found, skip snapshot
      await ctx.runMutation(internal.autopilot.task_mutations.logActivity, {
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
        internal.autopilot.revenue_queries.getSnapshotByDate,
        { organizationId: args.organizationId, snapshotDate: today }
      );

      if (!existingSnapshot) {
        await ctx.runMutation(
          internal.autopilot.revenue_actions.createSnapshot,
          {
            organizationId: args.organizationId,
            snapshotDate: today,
            mrr: metrics.mrr,
            arr: metrics.arr,
            activeSubscriptions: metrics.activeSubscriptions,
            newSubscriptions: metrics.newSubscriptions,
            cancelledSubscriptions: metrics.cancelledSubscriptions,
            churnRate: metrics.churnRate,
            createdAt: Date.now(),
          }
        );
      }

      // Get previous snapshot to detect significant changes
      const previousSnapshot = await ctx.runQuery(
        internal.autopilot.revenue_queries.getSnapshotHistory,
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
      await ctx.runMutation(internal.autopilot.task_mutations.logActivity, {
        organizationId: args.organizationId,
        agent: "system",
        level: "success",
        message: "Revenue snapshot captured",
        details: `MRR: $${metrics.mrr}, ARR: $${metrics.arr}, Active: ${metrics.activeSubscriptions}, Churn: ${metrics.churnRate}%`,
      });
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Unknown error";

      await ctx.runMutation(internal.autopilot.task_mutations.logActivity, {
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
      internal.autopilot.revenue_queries.getEnabledOrgIds,
      {}
    );

    if (enabledOrgIds.length === 0) {
      return null;
    }

    let successCount = 0;
    let failureCount = 0;

    for (const organizationId of enabledOrgIds) {
      try {
        await ctx.runAction(
          internal.autopilot.revenue_actions.captureRevenueSnapshot,
          {
            organizationId,
          }
        );
        successCount += 1;
      } catch (error) {
        const msg = error instanceof Error ? error.message : "Unknown error";
        failureCount += 1;

        await ctx.runMutation(internal.autopilot.task_mutations.logActivity, {
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
