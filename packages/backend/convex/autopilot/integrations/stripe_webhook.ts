/**
 * Stripe webhook integration — real-time revenue data ingestion.
 *
 * Processes Stripe webhook events to populate autopilotRevenueSnapshots
 * in real-time (instead of only via daily cron).
 *
 * Events handled:
 * - customer.subscription.created → new subscription
 * - customer.subscription.deleted → cancellation
 * - invoice.paid → confirmed revenue
 * - customer.subscription.updated → plan changes
 */

import { v } from "convex/values";
import { internal } from "../../_generated/api";
import { internalMutation } from "../../_generated/server";

// ============================================
// WEBHOOK EVENT PROCESSING
// ============================================

/**
 * Process a Stripe webhook event and update revenue data.
 * Called from the API route after webhook signature verification.
 */
export const processStripeEvent = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    eventType: v.string(),
    eventData: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const now = Date.now();

    // Log the event
    await ctx.runMutation(internal.autopilot.task_mutations.logActivity, {
      organizationId: args.organizationId,
      agent: "system",
      level: "info",
      message: `Stripe webhook: ${args.eventType}`,
      action: "stripe.webhook",
    });

    // For subscription events, trigger a fresh snapshot capture
    const snapshotTriggerEvents = [
      "customer.subscription.created",
      "customer.subscription.deleted",
      "customer.subscription.updated",
      "invoice.paid",
    ];

    if (snapshotTriggerEvents.includes(args.eventType)) {
      // Schedule a snapshot capture (uses the existing daily snapshot action)
      await ctx.scheduler.runAfter(
        5000, // 5s delay to let Stripe settle
        internal.autopilot.revenue_actions.captureRevenueSnapshot,
        { organizationId: args.organizationId }
      );
    }

    // For significant events, create an alert document for CEO
    const alertEvents: Record<string, string> = {
      "customer.subscription.created": "New subscription",
      "customer.subscription.deleted": "Subscription cancelled",
    };

    const alertMessage = alertEvents[args.eventType];
    if (alertMessage) {
      try {
        const data = JSON.parse(args.eventData);
        const amount = data.plan?.amount
          ? `$${(data.plan.amount / 100).toFixed(2)}/${data.plan.interval}`
          : "";

        await ctx.db.insert("autopilotActivityLog", {
          organizationId: args.organizationId,
          agent: "system",
          level: args.eventType.includes("deleted") ? "warning" : "success",
          message: `${alertMessage}${amount ? ` (${amount})` : ""}`,
          action: "revenue.event",
          createdAt: now,
        });
      } catch {
        // Event data parsing is best-effort
      }
    }

    return null;
  },
});

/**
 * Record a manual revenue snapshot (for orgs without Stripe).
 * Lets the President input revenue data directly.
 */
export const recordManualSnapshot = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    mrr: v.number(),
    activeSubscriptions: v.number(),
    newSubscriptions: v.optional(v.number()),
    cancelledSubscriptions: v.optional(v.number()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const now = Date.now();
    const snapshotDate = new Date(now).toISOString().split("T")[0];

    await ctx.runMutation(internal.autopilot.revenue_actions.createSnapshot, {
      organizationId: args.organizationId,
      snapshotDate,
      mrr: args.mrr,
      arr: args.mrr * 12,
      activeSubscriptions: args.activeSubscriptions,
      newSubscriptions: args.newSubscriptions ?? 0,
      cancelledSubscriptions: args.cancelledSubscriptions ?? 0,
      churnRate: 0,
      createdAt: now,
    });

    await ctx.runMutation(internal.autopilot.task_mutations.logActivity, {
      organizationId: args.organizationId,
      agent: "system",
      level: "info",
      message: `Manual revenue snapshot recorded: MRR $${args.mrr}`,
      action: "revenue.manual",
    });

    return null;
  },
});
