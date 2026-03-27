import { v } from "convex/values";
import { internal } from "../_generated/api";
import {
  internalAction,
  internalMutation,
  internalQuery,
} from "../_generated/server";

// ============================================
// INTERNAL QUERIES
// ============================================

export const getActiveMonitors = internalQuery({
  args: {},
  handler: async (ctx) => {
    const monitors = await ctx.db.query("statusMonitors").collect();
    return monitors.filter((m) => m.status !== "paused");
  },
});

export const getActiveIncidentForMonitor = internalQuery({
  args: { monitorId: v.id("statusMonitors") },
  handler: async (ctx, args) => {
    const incidents = await ctx.db.query("statusIncidents").collect();

    return (
      incidents.find(
        (i) =>
          i.status !== "resolved" &&
          i.affectedMonitorIds.includes(args.monitorId)
      ) ?? null
    );
  },
});

// ============================================
// INTERNAL MUTATIONS
// ============================================

export const recordCheck = internalMutation({
  args: {
    monitorId: v.id("statusMonitors"),
    organizationId: v.id("organizations"),
    statusCode: v.optional(v.number()),
    responseTimeMs: v.optional(v.number()),
    isUp: v.boolean(),
    errorMessage: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    await ctx.db.insert("statusChecks", {
      monitorId: args.monitorId,
      organizationId: args.organizationId,
      statusCode: args.statusCode,
      responseTimeMs: args.responseTimeMs,
      isUp: args.isUp,
      errorMessage: args.errorMessage,
      checkedAt: now,
    });

    const monitor = await ctx.db.get(args.monitorId);
    if (!monitor) {
      return;
    }

    if (args.isUp) {
      const wasDown =
        monitor.status === "major_outage" || monitor.status === "degraded";

      await ctx.db.patch(args.monitorId, {
        status: "operational",
        consecutiveFailures: 0,
        lastCheckedAt: now,
        lastResponseTimeMs: args.responseTimeMs,
        updatedAt: now,
      });

      return { recovered: wasDown, monitorId: args.monitorId };
    }

    const newFailures = monitor.consecutiveFailures + 1;
    const newStatus =
      newFailures >= monitor.alertThreshold ? "major_outage" : "degraded";

    await ctx.db.patch(args.monitorId, {
      status: newStatus,
      consecutiveFailures: newFailures,
      lastCheckedAt: now,
      lastResponseTimeMs: args.responseTimeMs,
      updatedAt: now,
    });

    return {
      shouldAlert: newFailures === monitor.alertThreshold,
      monitorId: args.monitorId,
    };
  },
});

export const autoCreateIncident = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    monitorId: v.id("statusMonitors"),
    monitorName: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // Check if there's already an active incident for this monitor
    const existingIncidents = await ctx.db
      .query("statusIncidents")
      .withIndex("by_org_status", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .collect();

    const hasActiveIncident = existingIncidents.some(
      (i) =>
        i.status !== "resolved" && i.affectedMonitorIds.includes(args.monitorId)
    );

    if (hasActiveIncident) {
      return null;
    }

    const incidentId = await ctx.db.insert("statusIncidents", {
      organizationId: args.organizationId,
      title: `${args.monitorName} is experiencing issues`,
      severity: "major",
      status: "investigating",
      affectedMonitorIds: [args.monitorId],
      autoDetected: true,
      startedAt: now,
      createdAt: now,
      updatedAt: now,
    });

    await ctx.db.insert("statusIncidentUpdates", {
      incidentId,
      organizationId: args.organizationId,
      status: "investigating",
      message: `Automated monitoring detected that ${args.monitorName} is not responding. We are investigating the issue.`,
      createdAt: now,
    });

    return incidentId;
  },
});

export const autoResolveIncident = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    monitorId: v.id("statusMonitors"),
    monitorName: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    const incidents = await ctx.db
      .query("statusIncidents")
      .withIndex("by_org_status", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .collect();

    const activeIncident = incidents.find(
      (i) =>
        i.status !== "resolved" &&
        i.autoDetected &&
        i.affectedMonitorIds.includes(args.monitorId)
    );

    if (!activeIncident) {
      return null;
    }

    await ctx.db.patch(activeIncident._id, {
      status: "resolved",
      resolvedAt: now,
      updatedAt: now,
    });

    await ctx.db.insert("statusIncidentUpdates", {
      incidentId: activeIncident._id,
      organizationId: args.organizationId,
      status: "resolved",
      message: `${args.monitorName} has recovered and is now operational.`,
      createdAt: now,
    });

    return activeIncident._id;
  },
});

export const cleanupOldChecks = internalMutation({
  args: {},
  handler: async (ctx) => {
    const ninetyDaysAgo = Date.now() - 90 * 24 * 60 * 60 * 1000;
    const oldChecks = await ctx.db
      .query("statusChecks")
      .filter((q) => q.lt(q.field("checkedAt"), ninetyDaysAgo))
      .take(1000);

    for (const check of oldChecks) {
      await ctx.db.delete(check._id);
    }
  },
});

// ============================================
// MAIN CRON ACTION
// ============================================

export const runHealthChecks = internalAction({
  args: {},
  handler: async (ctx) => {
    const monitors = await ctx.runQuery(
      internal.status.healthCheck.getActiveMonitors,
      {}
    );

    for (const monitor of monitors) {
      const method = monitor.method ?? "HEAD";
      const startTime = Date.now();

      let isUp = false;
      let statusCode: number | undefined;
      let responseTimeMs: number | undefined;
      let errorMessage: string | undefined;

      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10_000);

        const response = await fetch(monitor.url, {
          method,
          signal: controller.signal,
          redirect: "follow",
        });

        clearTimeout(timeout);
        statusCode = response.status;
        responseTimeMs = Date.now() - startTime;
        isUp = statusCode >= 200 && statusCode < 400;
      } catch (err) {
        responseTimeMs = Date.now() - startTime;
        errorMessage = err instanceof Error ? err.message : "Unknown error";
      }

      const result = await ctx.runMutation(
        internal.status.healthCheck.recordCheck,
        {
          monitorId: monitor._id,
          organizationId: monitor.organizationId,
          statusCode,
          responseTimeMs,
          isUp,
          errorMessage,
        }
      );

      if (!result) {
        continue;
      }

      // Auto-create incident if threshold reached
      if ("shouldAlert" in result && result.shouldAlert) {
        await ctx.runMutation(internal.status.healthCheck.autoCreateIncident, {
          organizationId: monitor.organizationId,
          monitorId: monitor._id,
          monitorName: monitor.name,
        });
      }

      // Auto-resolve if monitor recovered
      if ("recovered" in result && result.recovered) {
        await ctx.runMutation(internal.status.healthCheck.autoResolveIncident, {
          organizationId: monitor.organizationId,
          monitorId: monitor._id,
          monitorName: monitor.name,
        });
      }
    }
  },
});
