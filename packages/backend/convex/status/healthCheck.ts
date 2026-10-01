import { paginationOptsValidator } from "convex/server";
import { type Infer, v } from "convex/values";
import { internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import {
  type ActionCtx,
  internalAction,
  internalMutation,
  internalQuery,
} from "../_generated/server";
import { getOrgTier } from "../billing/org_subscription";
import { PLAN_LIMITS } from "../billing/queries";
import {
  DnsResolutionUnavailableError,
  describeFetchFailure,
  fetchPublicUrl,
} from "../shared/outbound/public_fetch";
import { monitorMethod } from "./tableFields";

const MONITOR_PAGE_SIZE = 200;
const CHECK_BATCH_SIZE = 10;
const CHECK_TIMEOUT_MS = 10_000;

const dueMonitor = v.object({
  _id: v.id("statusMonitors"),
  method: v.optional(monitorMethod),
  name: v.string(),
  organizationId: v.id("organizations"),
  url: v.string(),
});

type DueMonitor = Infer<typeof dueMonitor>;

const dueMonitorsPage = v.object({
  continueCursor: v.string(),
  isDone: v.boolean(),
  monitors: v.array(dueMonitor),
});

export const getDueMonitorsPage = internalQuery({
  args: { paginationOpts: paginationOptsValidator },
  handler: async (ctx, args) => {
    const now = Date.now();
    const page = await ctx.db
      .query("statusMonitors")
      .paginate(args.paginationOpts);

    const orgMinInterval = new Map<Id<"organizations">, number>();
    const getOrgMinInterval = async (
      orgId: Id<"organizations">
    ): Promise<number> => {
      const cached = orgMinInterval.get(orgId);
      if (cached !== undefined) {
        return cached;
      }
      const tier = await getOrgTier(ctx, orgId);
      const min = PLAN_LIMITS[tier].minCheckIntervalMinutes;
      orgMinInterval.set(orgId, min);
      return min;
    };

    const monitors: DueMonitor[] = [];
    for (const m of page.page) {
      if (m.status === "paused") {
        continue;
      }
      // Enforce tier minimum even if stored value is lower (e.g. after downgrade)
      const tierMin = await getOrgMinInterval(m.organizationId);
      const effectiveInterval = Math.max(m.checkIntervalMinutes, tierMin);
      const isDue =
        !m.lastCheckedAt || now >= m.lastCheckedAt + effectiveInterval * 60_000;
      if (isDue) {
        monitors.push({
          _id: m._id,
          method: m.method,
          name: m.name,
          organizationId: m.organizationId,
          url: m.url,
        });
      }
    }
    return {
      continueCursor: page.continueCursor,
      isDone: page.isDone,
      monitors,
    };
  },
  returns: dueMonitorsPage,
});

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

interface ProbeResult {
  errorMessage?: string;
  isUp: boolean;
  responseTimeMs: number;
  statusCode?: number;
}

const probeMonitor = async (
  monitor: DueMonitor
): Promise<ProbeResult | null> => {
  const startTime = Date.now();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), CHECK_TIMEOUT_MS);
  try {
    const { response, requestDurationMs } = await fetchPublicUrl(monitor.url, {
      method: monitor.method ?? "HEAD",
      signal: controller.signal,
    });
    await response.body?.cancel();
    return {
      isUp: response.status >= 200 && response.status < 400,
      responseTimeMs: requestDurationMs,
      statusCode: response.status,
    };
  } catch (error) {
    if (error instanceof DnsResolutionUnavailableError) {
      return null;
    }
    return {
      errorMessage: describeFetchFailure(error),
      isUp: false,
      responseTimeMs: Date.now() - startTime,
    };
  } finally {
    clearTimeout(timeout);
  }
};

const checkMonitor = async (
  ctx: ActionCtx,
  monitor: DueMonitor
): Promise<void> => {
  const probe = await probeMonitor(monitor);
  if (!probe) {
    return;
  }

  const result = await ctx.runMutation(
    internal.status.healthCheck.recordCheck,
    {
      ...probe,
      monitorId: monitor._id,
      organizationId: monitor.organizationId,
    }
  );

  const incidentArgs = {
    monitorId: monitor._id,
    monitorName: monitor.name,
    organizationId: monitor.organizationId,
  };
  if (result && "shouldAlert" in result && result.shouldAlert) {
    await ctx.runMutation(
      internal.status.healthCheck.autoCreateIncident,
      incidentArgs
    );
  }
  if (result && "recovered" in result && result.recovered) {
    await ctx.runMutation(
      internal.status.healthCheck.autoResolveIncident,
      incidentArgs
    );
  }
};

export const checkMonitorBatch = internalAction({
  args: { monitors: v.array(dueMonitor) },
  handler: async (ctx, args) => {
    await Promise.all(args.monitors.map((m) => checkMonitor(ctx, m)));
  },
  returns: v.null(),
});

/** Fans due monitors out into small scheduled batches so one tenant's slow targets can't stall the rest. */
export const runHealthChecks = internalAction({
  args: {},
  handler: async (ctx) => {
    let cursor: string | null = null;
    let isDone = false;
    while (!isDone) {
      const page: Infer<typeof dueMonitorsPage> = await ctx.runQuery(
        internal.status.healthCheck.getDueMonitorsPage,
        { paginationOpts: { cursor, numItems: MONITOR_PAGE_SIZE } }
      );
      for (let i = 0; i < page.monitors.length; i += CHECK_BATCH_SIZE) {
        await ctx.scheduler.runAfter(
          0,
          internal.status.healthCheck.checkMonitorBatch,
          { monitors: page.monitors.slice(i, i + CHECK_BATCH_SIZE) }
        );
      }
      cursor = page.continueCursor;
      isDone = page.isDone;
    }
  },
  returns: v.null(),
});
