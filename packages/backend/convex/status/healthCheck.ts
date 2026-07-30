import { v } from "convex/values";
import { components, internal } from "../_generated/api";
import {
  internalAction,
  internalMutation,
  internalQuery,
} from "../_generated/server";
import { PLAN_LIMITS } from "../billing/queries";

// ============================================
// INTERNAL QUERIES
// ============================================

export const getActiveMonitors = internalQuery({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const monitors = await ctx.db.query("statusMonitors").collect();

    // Batch-fetch subscription status per org to enforce tier minimums
    const orgTierCache = new Map<string, number>();
    const getOrgMinInterval = async (orgId: string): Promise<number> => {
      const cached = orgTierCache.get(orgId);
      if (cached !== undefined) {
        return cached;
      }
      const subscription = await ctx.runQuery(
        components.stripe.public.getSubscriptionByOrgId,
        { orgId }
      );
      const hasActiveSub =
        subscription &&
        (subscription.status === "active" ||
          subscription.status === "trialing");
      const min = hasActiveSub
        ? PLAN_LIMITS.pro.minCheckIntervalMinutes
        : PLAN_LIMITS.free.minCheckIntervalMinutes;
      orgTierCache.set(orgId, min);
      return min;
    };

    const results: typeof monitors = [];
    for (const m of monitors) {
      if (m.status === "paused") {
        continue;
      }
      // Enforce tier minimum even if stored value is lower (e.g. after downgrade)
      const tierMin = await getOrgMinInterval(m.organizationId);
      const effectiveInterval = Math.max(m.checkIntervalMinutes, tierMin);

      if (m.lastCheckedAt) {
        const nextCheckAt = m.lastCheckedAt + effectiveInterval * 60 * 1000;
        if (now < nextCheckAt) {
          continue;
        }
      }
      results.push(m);
    }
    return results;
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
    errorMessage: v.optional(v.string()),
    isUp: v.boolean(),
    monitorId: v.id("statusMonitors"),
    organizationId: v.id("organizations"),
    responseTimeMs: v.optional(v.number()),
    statusCode: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    await ctx.db.insert("statusChecks", {
      checkedAt: now,
      errorMessage: args.errorMessage,
      isUp: args.isUp,
      monitorId: args.monitorId,
      organizationId: args.organizationId,
      responseTimeMs: args.responseTimeMs,
      statusCode: args.statusCode,
    });

    const monitor = await ctx.db.get(args.monitorId);
    if (!monitor) {
      return;
    }

    if (args.isUp) {
      const wasDown =
        monitor.status === "major_outage" || monitor.status === "degraded";

      await ctx.db.patch(args.monitorId, {
        consecutiveFailures: 0,
        lastCheckedAt: now,
        lastResponseTimeMs: args.responseTimeMs,
        status: "operational",
        updatedAt: now,
      });

      return { monitorId: args.monitorId, recovered: wasDown };
    }

    const newFailures = monitor.consecutiveFailures + 1;
    const newStatus =
      newFailures >= monitor.alertThreshold ? "major_outage" : "degraded";

    await ctx.db.patch(args.monitorId, {
      consecutiveFailures: newFailures,
      lastCheckedAt: now,
      lastResponseTimeMs: args.responseTimeMs,
      status: newStatus,
      updatedAt: now,
    });

    return {
      monitorId: args.monitorId,
      shouldAlert: newFailures === monitor.alertThreshold,
    };
  },
});

export const autoCreateIncident = internalMutation({
  args: {
    monitorId: v.id("statusMonitors"),
    monitorName: v.string(),
    organizationId: v.id("organizations"),
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
      affectedMonitorIds: [args.monitorId],
      autoDetected: true,
      createdAt: now,
      organizationId: args.organizationId,
      severity: "major",
      startedAt: now,
      status: "investigating",
      title: `${args.monitorName} is experiencing issues`,
      updatedAt: now,
    });

    await ctx.db.insert("statusIncidentUpdates", {
      createdAt: now,
      incidentId,
      message: `Automated monitoring detected that ${args.monitorName} is not responding. We are investigating the issue.`,
      organizationId: args.organizationId,
      status: "investigating",
    });

    return incidentId;
  },
});

export const autoResolveIncident = internalMutation({
  args: {
    monitorId: v.id("statusMonitors"),
    monitorName: v.string(),
    organizationId: v.id("organizations"),
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
      resolvedAt: now,
      status: "resolved",
      updatedAt: now,
    });

    await ctx.db.insert("statusIncidentUpdates", {
      createdAt: now,
      incidentId: activeIncident._id,
      message: `${args.monitorName} has recovered and is now operational.`,
      organizationId: args.organizationId,
      status: "resolved",
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
          redirect: "follow",
          signal: controller.signal,
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
          errorMessage,
          isUp,
          monitorId: monitor._id,
          organizationId: monitor.organizationId,
          responseTimeMs,
          statusCode,
        }
      );

      if (!result) {
        continue;
      }

      // Auto-create incident if threshold reached
      if ("shouldAlert" in result && result.shouldAlert) {
        await ctx.runMutation(internal.status.healthCheck.autoCreateIncident, {
          monitorId: monitor._id,
          monitorName: monitor.name,
          organizationId: monitor.organizationId,
        });
      }

      // Auto-resolve if monitor recovered
      if ("recovered" in result && result.recovered) {
        await ctx.runMutation(internal.status.healthCheck.autoResolveIncident, {
          monitorId: monitor._id,
          monitorName: monitor.name,
          organizationId: monitor.organizationId,
        });
      }
    }
  },
});
