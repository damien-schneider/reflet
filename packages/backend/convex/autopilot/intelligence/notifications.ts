import { v } from "convex/values";
import { internal } from "../../_generated/api";
import {
  internalAction,
  internalMutation,
  internalQuery,
} from "../../_generated/server";

// ============================================
// INTERNAL QUERIES
// ============================================

/**
 * Get admin member user IDs for an organization
 */
export const getAdminUserIds = internalQuery({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    const members = await ctx.db
      .query("organizationMembers")
      .withIndex("by_org_user", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .collect();

    return members
      .filter((m) => m.role === "admin" || m.role === "owner")
      .map((m) => m.userId);
  },
});

/**
 * Get new high-priority insights for an org since a given timestamp
 */
export const getHighPriorityInsightsSince = internalQuery({
  args: {
    organizationId: v.id("organizations"),
    since: v.number(),
  },
  handler: async (ctx, args) => {
    const insights = await ctx.db
      .query("intelligenceInsights")
      .withIndex("by_org_created", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .collect();

    return insights.filter(
      (i) =>
        i.createdAt >= args.since &&
        i.status === "new" &&
        (i.priority === "critical" || i.priority === "high")
    );
  },
});

/**
 * Get intelligence digest data for an organization
 */
export const getDigestData = internalQuery({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;

    const insights = await ctx.db
      .query("intelligenceInsights")
      .withIndex("by_org_created", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .collect();

    const recentInsights = insights.filter((i) => i.createdAt >= sevenDaysAgo);

    const signals = await ctx.db
      .query("intelligenceSignals")
      .withIndex("by_org_created", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .collect();

    const recentSignals = signals.filter((s) => s.createdAt >= sevenDaysAgo);

    const competitors = await ctx.db
      .query("competitors")
      .withIndex("by_org_status", (q) =>
        q.eq("organizationId", args.organizationId).eq("status", "active")
      )
      .collect();

    return {
      totalInsights: recentInsights.length,
      criticalInsights: recentInsights.filter((i) => i.priority === "critical")
        .length,
      highInsights: recentInsights.filter((i) => i.priority === "high").length,
      featureSuggestions: recentInsights.filter(
        (i) => i.type === "feature_suggestion"
      ).length,
      competitiveAlerts: recentInsights.filter(
        (i) => i.type === "competitive_alert"
      ).length,
      totalSignals: recentSignals.length,
      redditSignals: recentSignals.filter((s) => s.source === "reddit").length,
      webSignals: recentSignals.filter((s) => s.source === "web").length,
      competitorUpdates: recentSignals.filter(
        (s) =>
          s.source === "competitor_changelog" ||
          s.source === "competitor_pricing" ||
          s.source === "competitor_features"
      ).length,
      activeCompetitors: competitors.length,
      topInsights: recentInsights
        .filter((i) => i.priority === "critical" || i.priority === "high")
        .slice(0, 5)
        .map((i) => ({ title: i.title, type: i.type, priority: i.priority })),
    };
  },
});

// ============================================
// INTERNAL MUTATIONS
// ============================================

/**
 * Create in-app notifications for high-priority insights
 */
export const createInsightNotifications = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    insightTitle: v.string(),
    insightId: v.id("intelligenceInsights"),
    priority: v.string(),
  },
  handler: async (ctx, args) => {
    const members = await ctx.db
      .query("organizationMembers")
      .withIndex("by_org_user", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .collect();

    const admins = members.filter(
      (m) => m.role === "admin" || m.role === "owner"
    );

    const now = Date.now();
    for (const admin of admins) {
      await ctx.db.insert("notifications", {
        userId: admin.userId,
        type: "intelligence_insight",
        title: `${args.priority === "critical" ? "Critical" : "High Priority"} Intelligence Insight`,
        message: args.insightTitle,
        isRead: false,
        createdAt: now,
      });
    }
  },
});

// ============================================
// INTERNAL ACTIONS
// ============================================

/**
 * Send notifications for new high-priority insights
 * Called after synthesis completes
 */
export const notifyHighPriorityInsights = internalAction({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    const tenMinutesAgo = Date.now() - 10 * 60 * 1000;

    const insights = await ctx.runQuery(
      internal.autopilot.intelligence.notifications
        .getHighPriorityInsightsSince,
      { organizationId: args.organizationId, since: tenMinutesAgo }
    );

    for (const insight of insights) {
      await ctx.runMutation(
        internal.autopilot.intelligence.notifications
          .createInsightNotifications,
        {
          organizationId: args.organizationId,
          insightTitle: insight.title,
          insightId: insight._id,
          priority: insight.priority,
        }
      );
    }
  },
});

/**
 * Send weekly intelligence digest emails to org admins
 */
export const sendIntelligenceDigest = internalAction({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    const digest = await ctx.runQuery(
      internal.autopilot.intelligence.notifications.getDigestData,
      { organizationId: args.organizationId }
    );

    if (!digest || digest.totalInsights === 0) {
      return;
    }

    const adminUserIds = await ctx.runQuery(
      internal.autopilot.intelligence.notifications.getAdminUserIds,
      { organizationId: args.organizationId }
    );

    // Create in-app notification summary for each admin
    for (const userId of adminUserIds) {
      const summaryParts: string[] = [];
      if (digest.criticalInsights > 0) {
        summaryParts.push(`${digest.criticalInsights} critical`);
      }
      if (digest.highInsights > 0) {
        summaryParts.push(`${digest.highInsights} high priority`);
      }
      summaryParts.push(`${digest.totalInsights} total insights`);

      await ctx.runMutation(
        internal.autopilot.intelligence.notifications.createDigestNotification,
        {
          userId,
          message: `Weekly Intelligence: ${summaryParts.join(", ")} from ${digest.totalSignals} signals across ${digest.activeCompetitors} competitors.`,
        }
      );
    }
  },
});

/**
 * Send all intelligence digests for all orgs
 */
export const sendAllIntelligenceDigests = internalAction({
  args: {},
  handler: async (ctx) => {
    const configs = await ctx.runQuery(
      internal.autopilot.intelligence.notifications.getAllConfiguredOrgs,
      {}
    );

    for (const config of configs) {
      await ctx
        .runAction(
          internal.autopilot.intelligence.notifications.sendIntelligenceDigest,
          {
            organizationId: config.organizationId,
          }
        )
        .catch(() => {
          // Non-fatal: individual org digest failures don't block others
        });
    }
  },
});

/**
 * Get all orgs with intelligence configured
 */
export const getAllConfiguredOrgs = internalQuery({
  args: {},
  handler: (ctx) => {
    return ctx.db.query("intelligenceConfig").collect();
  },
});

/**
 * Create a digest notification for a user
 */
export const createDigestNotification = internalMutation({
  args: {
    userId: v.string(),
    message: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("notifications", {
      userId: args.userId,
      type: "intelligence_insight",
      title: "Weekly Intelligence Digest",
      message: args.message,
      isRead: false,
      createdAt: Date.now(),
    });
  },
});
