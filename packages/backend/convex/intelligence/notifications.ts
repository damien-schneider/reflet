import { v } from "convex/values";
import { internal } from "../_generated/api";
import {
  internalAction,
  internalMutation,
  internalQuery,
} from "../_generated/server";

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
      activeCompetitors: competitors.length,
      competitiveAlerts: recentInsights.filter(
        (i) => i.type === "competitive_alert"
      ).length,
      competitorUpdates: recentSignals.filter(
        (s) =>
          s.source === "competitor_changelog" ||
          s.source === "competitor_pricing" ||
          s.source === "competitor_features"
      ).length,
      criticalInsights: recentInsights.filter((i) => i.priority === "critical")
        .length,
      featureSuggestions: recentInsights.filter(
        (i) => i.type === "feature_suggestion"
      ).length,
      highInsights: recentInsights.filter((i) => i.priority === "high").length,
      redditSignals: recentSignals.filter((s) => s.source === "reddit").length,
      topInsights: recentInsights
        .filter((i) => i.priority === "critical" || i.priority === "high")
        .slice(0, 5)
        .map((i) => ({ priority: i.priority, title: i.title, type: i.type })),
      totalInsights: recentInsights.length,
      totalSignals: recentSignals.length,
      webSignals: recentSignals.filter((s) => s.source === "web").length,
    };
  },
});

/**
 * Create in-app notifications for high-priority insights
 */
export const createInsightNotifications = internalMutation({
  args: {
    insightId: v.id("intelligenceInsights"),
    insightTitle: v.string(),
    organizationId: v.id("organizations"),
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
        createdAt: now,
        isRead: false,
        message: args.insightTitle,
        title: `${args.priority === "critical" ? "Critical" : "High Priority"} Intelligence Insight`,
        type: "intelligence_insight",
        userId: admin.userId,
      });
    }
  },
});

/**
 * Send notifications for new high-priority insights
 * Called after synthesis completes
 */
export const notifyHighPriorityInsights = internalAction({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    const tenMinutesAgo = Date.now() - 10 * 60 * 1000;

    const insights = await ctx.runQuery(
      internal.intelligence.notifications.getHighPriorityInsightsSince,
      { organizationId: args.organizationId, since: tenMinutesAgo }
    );

    for (const insight of insights) {
      await ctx.runMutation(
        internal.intelligence.notifications.createInsightNotifications,
        {
          insightId: insight._id,
          insightTitle: insight.title,
          organizationId: args.organizationId,
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
      internal.intelligence.notifications.getDigestData,
      { organizationId: args.organizationId }
    );

    if (!digest || digest.totalInsights === 0) {
      return;
    }

    const adminUserIds = await ctx.runQuery(
      internal.intelligence.notifications.getAdminUserIds,
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
        internal.intelligence.notifications.createDigestNotification,
        {
          message: `Weekly Intelligence: ${summaryParts.join(", ")} from ${digest.totalSignals} signals across ${digest.activeCompetitors} competitors.`,
          userId,
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
      internal.intelligence.notifications.getAllConfiguredOrgs,
      {}
    );

    for (const config of configs) {
      await ctx
        .runAction(internal.intelligence.notifications.sendIntelligenceDigest, {
          organizationId: config.organizationId,
        })
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
  handler: (ctx) => ctx.db.query("intelligenceConfig").collect(),
});

/**
 * Create a digest notification for a user
 */
export const createDigestNotification = internalMutation({
  args: {
    message: v.string(),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("notifications", {
      createdAt: Date.now(),
      isRead: false,
      message: args.message,
      title: "Weekly Intelligence Digest",
      type: "intelligence_insight",
      userId: args.userId,
    });
  },
});
