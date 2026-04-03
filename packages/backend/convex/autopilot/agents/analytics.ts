/**
 * Analytics Agent — captures product analytics snapshots, detects anomalies,
 * generates weekly briefs, and correlates data with shipped features.
 *
 * Flow:
 *   1. Daily: pull metrics from PostHog (active users, retention, errors)
 *   2. Store snapshots in autopilotAnalyticsSnapshots
 *   3. Detect anomalies by comparing current vs baseline
 *   4. Weekly: generate AI brief with trends and recommendations
 *   5. Correlate spikes/dips with recently shipped features
 */

import { v } from "convex/values";
import { z } from "zod";
import { internal } from "../../_generated/api";
import { internalAction, internalQuery } from "../../_generated/server";
import { MODELS } from "./models";
import { generateObjectWithFallback } from "./shared";

const ANALYTICS_MODELS = [MODELS.FREE, MODELS.FAST] as const;

// ============================================
// ZOD SCHEMAS
// ============================================

const anomalyDetectionSchema = z.object({
  anomalies: z.array(
    z.object({
      metric: z.string(),
      currentValue: z.number(),
      baselineValue: z.number(),
      changePercent: z.number(),
      severity: z.enum(["info", "warning", "critical"]),
      description: z.string(),
    })
  ),
  overallHealth: z.enum(["healthy", "warning", "critical"]),
});

const analyticsBriefSchema = z.object({
  summary: z.string(),
  keyTrends: z.array(
    z.object({
      trend: z.string(),
      direction: z.enum(["up", "down", "stable"]),
      impact: z.enum(["positive", "negative", "neutral"]),
      recommendation: z.string(),
    })
  ),
  featureAdoption: z.array(
    z.object({
      feature: z.string(),
      adoptionRate: z.number(),
      trend: z.enum(["growing", "declining", "stable"]),
    })
  ),
  recommendations: z.array(z.string()),
});

// ============================================
// DAILY SNAPSHOT
// ============================================

export const captureAnalyticsSnapshot = internalAction({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    await ctx.runMutation(internal.autopilot.tasks.logActivity, {
      organizationId: args.organizationId,
      agent: "analytics",
      level: "action",
      message: "Capturing daily analytics snapshot",
    });

    // Get recent snapshots for baseline comparison
    const recentSnapshots = await ctx.runQuery(
      internal.autopilot.agents.analytics.getRecentSnapshots,
      { organizationId: args.organizationId, limit: 7 }
    );

    const today = new Date().toISOString().split("T")[0];

    // Store snapshot (in production, these would come from PostHog MCP)
    // For now, create a placeholder snapshot that will be populated
    // when PostHog integration is configured
    const snapshotData = {
      organizationId: args.organizationId,
      snapshotDate: today,
      activeUsers: 0,
      newUsers: 0,
      createdAt: Date.now(),
    };

    await ctx.runMutation(
      internal.autopilot.agents.analytics.storeSnapshot,
      snapshotData
    );

    // Detect anomalies if we have baseline data
    if (recentSnapshots.length >= 3) {
      const baselineAvg = {
        activeUsers:
          recentSnapshots.reduce((sum, s) => sum + s.activeUsers, 0) /
          recentSnapshots.length,
        newUsers:
          recentSnapshots.reduce((sum, s) => sum + s.newUsers, 0) /
          recentSnapshots.length,
        errorCount:
          recentSnapshots.reduce((sum, s) => sum + (s.errorCount ?? 0), 0) /
          recentSnapshots.length,
      };

      const snapshotSummary = `Current: ${snapshotData.activeUsers} active users, ${snapshotData.newUsers} new users.
Baseline (7d avg): ${Math.round(baselineAvg.activeUsers)} active, ${Math.round(baselineAvg.newUsers)} new, ${Math.round(baselineAvg.errorCount)} errors.`;

      const anomalyResult = await generateObjectWithFallback({
        models: ANALYTICS_MODELS,
        schema: anomalyDetectionSchema,
        systemPrompt:
          "You detect anomalies in product analytics by comparing current metrics to historical baselines. Flag significant deviations.",
        prompt: `Analyze these metrics for anomalies:\n\n${snapshotSummary}`,
      });

      for (const anomaly of anomalyResult.anomalies) {
        if (anomaly.severity !== "info") {
          await ctx.runMutation(internal.autopilot.inbox.createInboxItem, {
            organizationId: args.organizationId,
            type: "analytics_anomaly",
            title: `Anomaly: ${anomaly.metric} ${anomaly.changePercent > 0 ? "+" : ""}${anomaly.changePercent.toFixed(1)}%`,
            summary: anomaly.description,
            sourceAgent: "analytics",
            priority: anomaly.severity === "critical" ? "high" : "medium",
            metadata: JSON.stringify(anomaly),
          });
        }
      }
    }

    await ctx.runMutation(internal.autopilot.tasks.logActivity, {
      organizationId: args.organizationId,
      agent: "analytics",
      level: "success",
      message: `Analytics snapshot captured for ${today}`,
    });
  },
});

// ============================================
// WEEKLY BRIEF
// ============================================

export const runAnalyticsBrief = internalAction({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    await ctx.runMutation(internal.autopilot.tasks.logActivity, {
      organizationId: args.organizationId,
      agent: "analytics",
      level: "action",
      message: "Generating weekly analytics brief",
    });

    const snapshots = await ctx.runQuery(
      internal.autopilot.agents.analytics.getRecentSnapshots,
      { organizationId: args.organizationId, limit: 30 }
    );

    if (snapshots.length === 0) {
      await ctx.runMutation(internal.autopilot.tasks.logActivity, {
        organizationId: args.organizationId,
        agent: "analytics",
        level: "info",
        message: "No analytics data available for brief",
      });
      return;
    }

    // Get recently completed tasks for correlation
    const completedTasks = await ctx.runQuery(
      internal.autopilot.agents.support.getRecentlyCompletedTasks,
      { organizationId: args.organizationId }
    );

    const snapshotData = snapshots
      .map(
        (s) =>
          `${s.snapshotDate}: ${s.activeUsers} active, ${s.newUsers} new, ${s.errorCount ?? 0} errors`
      )
      .join("\n");

    const taskData =
      completedTasks.length > 0
        ? completedTasks.map((t) => `- ${t.title}`).join("\n")
        : "No recently shipped features";

    const brief = await generateObjectWithFallback({
      models: ANALYTICS_MODELS,
      schema: analyticsBriefSchema,
      systemPrompt:
        "You are a product analytics expert. Generate a concise weekly brief analyzing product health, user trends, and feature adoption.",
      prompt: `Generate a weekly analytics brief from this data:\n\nMetrics (last 30 days):\n${snapshotData}\n\nRecently shipped:\n${taskData}`,
    });

    await ctx.runMutation(internal.autopilot.inbox.createInboxItem, {
      organizationId: args.organizationId,
      type: "analytics_brief",
      title: "Weekly Analytics Brief",
      summary: brief.summary,
      content: JSON.stringify(brief),
      sourceAgent: "analytics",
      priority: "medium",
    });

    // Create insights for notable trends
    for (const trend of brief.keyTrends) {
      if (trend.impact !== "neutral") {
        await ctx.runMutation(internal.autopilot.inbox.createInboxItem, {
          organizationId: args.organizationId,
          type: "analytics_insight",
          title: `Trend: ${trend.trend}`,
          summary: trend.recommendation,
          sourceAgent: "analytics",
          priority: trend.impact === "negative" ? "high" : "low",
          metadata: JSON.stringify(trend),
        });
      }
    }

    await ctx.runMutation(internal.autopilot.tasks.logActivity, {
      organizationId: args.organizationId,
      agent: "analytics",
      level: "success",
      message: `Weekly analytics brief generated — ${brief.keyTrends.length} trends identified`,
    });
  },
});

// ============================================
// INTERNAL QUERIES & MUTATIONS
// ============================================

export const getRecentSnapshots = internalQuery({
  args: {
    organizationId: v.id("organizations"),
    limit: v.number(),
  },
  returns: v.array(
    v.object({
      _id: v.id("autopilotAnalyticsSnapshots"),
      _creationTime: v.number(),
      organizationId: v.id("organizations"),
      snapshotDate: v.string(),
      activeUsers: v.number(),
      newUsers: v.number(),
      retention7d: v.optional(v.number()),
      retention30d: v.optional(v.number()),
      topFeatures: v.optional(v.string()),
      funnelDropoffs: v.optional(v.string()),
      errorCount: v.optional(v.number()),
      insights: v.optional(v.string()),
      createdAt: v.number(),
    })
  ),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("autopilotAnalyticsSnapshots")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .order("desc")
      .take(args.limit);
  },
});

import { internalMutation } from "../../_generated/server";

export const storeSnapshot = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    snapshotDate: v.string(),
    activeUsers: v.number(),
    newUsers: v.number(),
    retention7d: v.optional(v.number()),
    retention30d: v.optional(v.number()),
    topFeatures: v.optional(v.string()),
    funnelDropoffs: v.optional(v.string()),
    errorCount: v.optional(v.number()),
    insights: v.optional(v.string()),
    createdAt: v.number(),
  },
  handler: async (ctx, args) => {
    // Check if snapshot already exists for this date
    const existing = await ctx.db
      .query("autopilotAnalyticsSnapshots")
      .withIndex("by_org_date", (q) =>
        q
          .eq("organizationId", args.organizationId)
          .eq("snapshotDate", args.snapshotDate)
      )
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        activeUsers: args.activeUsers,
        newUsers: args.newUsers,
        retention7d: args.retention7d,
        retention30d: args.retention30d,
        topFeatures: args.topFeatures,
        funnelDropoffs: args.funnelDropoffs,
        errorCount: args.errorCount,
        insights: args.insights,
      });
      return existing._id;
    }

    return await ctx.db.insert("autopilotAnalyticsSnapshots", args);
  },
});
