import { v } from "convex/values";
import { components } from "../_generated/api";
import { mutation, query } from "../_generated/server";
import { PLAN_LIMITS } from "../billing/queries";
import { monitorMethod, monitorStatus } from "./tableFields";

// ============================================
// QUERIES
// ============================================

export const listMonitors = query({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    const monitors = await ctx.db
      .query("statusMonitors")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .collect();

    // Fetch recent checks for sparklines (last 24h)
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
    const monitorsWithChecks = await Promise.all(
      monitors.map(async (monitor) => {
        const recentChecks = await ctx.db
          .query("statusChecks")
          .withIndex("by_monitor_time", (q) =>
            q.eq("monitorId", monitor._id).gte("checkedAt", oneDayAgo)
          )
          .collect();

        return { ...monitor, recentChecks };
      })
    );

    return monitorsWithChecks;
  },
});

export const getMonitorWithHistory = query({
  args: {
    monitorId: v.id("statusMonitors"),
  },
  handler: async (ctx, args) => {
    const monitor = await ctx.db.get(args.monitorId);
    if (!monitor) {
      return null;
    }

    // Last 7 days of checks
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const checks = await ctx.db
      .query("statusChecks")
      .withIndex("by_monitor_time", (q) =>
        q.eq("monitorId", args.monitorId).gte("checkedAt", sevenDaysAgo)
      )
      .collect();

    // Related incidents
    const incidents = await ctx.db
      .query("statusIncidents")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", monitor.organizationId)
      )
      .collect();

    const relatedIncidents = incidents.filter((i) =>
      i.affectedMonitorIds.includes(args.monitorId)
    );

    return { ...monitor, checks, relatedIncidents };
  },
});

export const getAggregateStatus = query({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    const monitors = await ctx.db
      .query("statusMonitors")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .collect();

    const publicMonitors = monitors.filter((m) => m.status !== "paused");

    if (publicMonitors.length === 0) {
      return { monitorCount: 0, status: "no_monitors" as const };
    }

    const hasMajorOutage = publicMonitors.some(
      (m) => m.status === "major_outage"
    );
    const hasDegraded = publicMonitors.some((m) => m.status === "degraded");

    let status: "major_outage" | "degraded" | "operational" = "operational";
    if (hasMajorOutage) {
      status = "major_outage";
    } else if (hasDegraded) {
      status = "degraded";
    }

    return { monitorCount: publicMonitors.length, status };
  },
});

export const getMonitorsUptimeBars = query({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    const monitors = await ctx.db
      .query("statusMonitors")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .collect();

    const ninetyDaysAgo = Date.now() - 90 * 24 * 60 * 60 * 1000;

    const results = await Promise.all(
      monitors.map(async (monitor) => {
        const checks = await ctx.db
          .query("statusChecks")
          .withIndex("by_monitor_time", (q) =>
            q.eq("monitorId", monitor._id).gte("checkedAt", ninetyDaysAgo)
          )
          .collect();

        const dailyBuckets = new Map<string, { total: number; up: number }>();
        for (const check of checks) {
          const day = new Date(check.checkedAt).toISOString().split("T")[0];
          const bucket = dailyBuckets.get(day) ?? { total: 0, up: 0 };
          bucket.total++;
          if (check.isUp) {
            bucket.up++;
          }
          dailyBuckets.set(day, bucket);
        }

        const days = [...dailyBuckets.entries()]
          .map(([date, bucket]) => ({
            date,
            uptimePercentage:
              bucket.total > 0
                ? Math.round((bucket.up / bucket.total) * 10_000) / 100
                : 100,
          }))
          .sort((a, b) => a.date.localeCompare(b.date));

        const totalChecks = checks.length;
        const upChecks = checks.filter((c) => c.isUp).length;
        const overallUptime =
          totalChecks > 0
            ? Math.round((upChecks / totalChecks) * 10_000) / 100
            : 100;

        return {
          days,
          monitorId: monitor._id,
          overallUptime,
        };
      })
    );

    return Object.fromEntries(results.map((r) => [r.monitorId, r]));
  },
});

// ============================================
// MUTATIONS
// ============================================

export const createMonitor = mutation({
  args: {
    alertThreshold: v.optional(v.number()),
    checkIntervalMinutes: v.optional(v.number()),
    groupName: v.optional(v.string()),
    isPublic: v.optional(v.boolean()),
    method: v.optional(monitorMethod),
    name: v.string(),
    organizationId: v.id("organizations"),
    url: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // Determine tier minimum check interval
    const subscription = await ctx.runQuery(
      components.stripe.public.getSubscriptionByOrgId,
      { orgId: args.organizationId }
    );
    const hasActiveSub =
      subscription &&
      (subscription.status === "active" || subscription.status === "trialing");
    const minInterval = hasActiveSub
      ? PLAN_LIMITS.pro.minCheckIntervalMinutes
      : PLAN_LIMITS.free.minCheckIntervalMinutes;
    const requestedInterval = args.checkIntervalMinutes ?? 5;
    const checkIntervalMinutes = Math.max(requestedInterval, minInterval);

    return await ctx.db.insert("statusMonitors", {
      alertThreshold: args.alertThreshold ?? 3,
      checkIntervalMinutes,
      consecutiveFailures: 0,
      createdAt: now,
      groupName: args.groupName,
      isPublic: args.isPublic ?? true,
      method: args.method,
      name: args.name,
      organizationId: args.organizationId,
      status: "operational",
      updatedAt: now,
      url: args.url,
    });
  },
});

export const updateMonitor = mutation({
  args: {
    alertThreshold: v.optional(v.number()),
    checkIntervalMinutes: v.optional(v.number()),
    groupName: v.optional(v.string()),
    groupOrder: v.optional(v.number()),
    isPublic: v.optional(v.boolean()),
    method: v.optional(monitorMethod),
    monitorId: v.id("statusMonitors"),
    name: v.optional(v.string()),
    order: v.optional(v.number()),
    status: v.optional(monitorStatus),
    url: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { monitorId, ...updates } = args;
    const filtered = Object.fromEntries(
      Object.entries(updates).filter(([, val]) => val !== undefined)
    );

    // Clamp checkIntervalMinutes to tier minimum if being updated
    if (args.checkIntervalMinutes !== undefined) {
      const monitor = await ctx.db.get(monitorId);
      if (monitor) {
        const subscription = await ctx.runQuery(
          components.stripe.public.getSubscriptionByOrgId,
          { orgId: monitor.organizationId }
        );
        const hasActiveSub =
          subscription &&
          (subscription.status === "active" ||
            subscription.status === "trialing");
        const minInterval = hasActiveSub
          ? PLAN_LIMITS.pro.minCheckIntervalMinutes
          : PLAN_LIMITS.free.minCheckIntervalMinutes;
        filtered.checkIntervalMinutes = Math.max(
          args.checkIntervalMinutes,
          minInterval
        );
      }
    }

    await ctx.db.patch(monitorId, {
      ...filtered,
      updatedAt: Date.now(),
    });
  },
});

export const deleteMonitor = mutation({
  args: { monitorId: v.id("statusMonitors") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.monitorId);
  },
});

export const reorderMonitors = mutation({
  args: {
    updates: v.array(
      v.object({
        groupName: v.optional(v.string()),
        groupOrder: v.optional(v.number()),
        monitorId: v.id("statusMonitors"),
        order: v.optional(v.number()),
      })
    ),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    for (const update of args.updates) {
      await ctx.db.patch(update.monitorId, {
        groupName: update.groupName,
        groupOrder: update.groupOrder,
        order: update.order,
        updatedAt: now,
      });
    }
  },
});
