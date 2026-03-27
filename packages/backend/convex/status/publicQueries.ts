import { v } from "convex/values";
import { query } from "../_generated/server";

// ============================================
// PUBLIC QUERIES (no auth required)
// ============================================

export const getPublicStatus = query({
  args: { orgSlug: v.string() },
  handler: async (ctx, args) => {
    // Find org by slug
    const org = await ctx.db
      .query("organizations")
      .filter((q) => q.eq(q.field("slug"), args.orgSlug))
      .unique();

    if (!org) {
      return null;
    }

    // Get public monitors
    const monitors = await ctx.db
      .query("statusMonitors")
      .withIndex("by_organization", (q) => q.eq("organizationId", org._id))
      .collect();

    const publicMonitors = monitors.filter(
      (m) => m.isPublic && m.status !== "paused"
    );

    // Get active incidents
    const allIncidents = await ctx.db
      .query("statusIncidents")
      .withIndex("by_org_status", (q) => q.eq("organizationId", org._id))
      .collect();

    const activeIncidents = allIncidents.filter((i) => i.status !== "resolved");

    // Get updates for active incidents
    const activeWithUpdates = await Promise.all(
      activeIncidents.map(async (incident) => {
        const updates = await ctx.db
          .query("statusIncidentUpdates")
          .withIndex("by_incident", (q) => q.eq("incidentId", incident._id))
          .collect();

        const affectedMonitorNames = publicMonitors
          .filter((m) => incident.affectedMonitorIds.includes(m._id))
          .map((m) => m.name);

        return {
          _id: incident._id,
          title: incident.title,
          severity: incident.severity,
          status: incident.status,
          startedAt: incident.startedAt,
          affectedMonitors: affectedMonitorNames,
          updates: updates
            .sort((a, b) => b.createdAt - a.createdAt)
            .map((u) => ({
              status: u.status,
              message: u.message,
              createdAt: u.createdAt,
            })),
        };
      })
    );

    // Compute overall status
    const hasMajorOutage = publicMonitors.some(
      (m) => m.status === "major_outage"
    );
    const hasDegraded = publicMonitors.some((m) => m.status === "degraded");
    let overallStatus = "operational";
    if (hasMajorOutage) {
      overallStatus = "major_outage";
    } else if (hasDegraded) {
      overallStatus = "degraded";
    }

    // Group monitors
    const grouped = new Map<
      string,
      Array<{
        _id: string;
        name: string;
        status: string;
        lastResponseTimeMs?: number;
      }>
    >();

    for (const m of publicMonitors) {
      const group = m.groupName ?? "Services";
      const existing = grouped.get(group) ?? [];
      existing.push({
        _id: m._id,
        name: m.name,
        status: m.status,
        lastResponseTimeMs: m.lastResponseTimeMs,
      });
      grouped.set(group, existing);
    }

    const monitorGroups = [...grouped.entries()]
      .map(([name, monitors]) => ({ name, monitors }))
      .sort((a, b) => a.name.localeCompare(b.name));

    return {
      orgName: org.name,
      orgLogo: org.logo,
      overallStatus,
      monitorGroups,
      activeIncidents: activeWithUpdates,
    };
  },
});

export const getPublicIncidentHistory = query({
  args: { orgSlug: v.string(), days: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const org = await ctx.db
      .query("organizations")
      .filter((q) => q.eq(q.field("slug"), args.orgSlug))
      .unique();

    if (!org) {
      return [];
    }

    const daysBack = args.days ?? 14;
    const cutoff = Date.now() - daysBack * 24 * 60 * 60 * 1000;

    const incidents = await ctx.db
      .query("statusIncidents")
      .withIndex("by_org_created", (q) =>
        q.eq("organizationId", org._id).gte("createdAt", cutoff)
      )
      .collect();

    const resolved = incidents.filter((i) => i.status === "resolved");

    const monitors = await ctx.db
      .query("statusMonitors")
      .withIndex("by_organization", (q) => q.eq("organizationId", org._id))
      .collect();

    const monitorNameMap = new Map(monitors.map((m) => [m._id, m.name]));

    const withUpdates = await Promise.all(
      resolved.map(async (incident) => {
        const updates = await ctx.db
          .query("statusIncidentUpdates")
          .withIndex("by_incident", (q) => q.eq("incidentId", incident._id))
          .collect();

        return {
          _id: incident._id,
          title: incident.title,
          severity: incident.severity,
          startedAt: incident.startedAt,
          resolvedAt: incident.resolvedAt,
          affectedMonitors: incident.affectedMonitorIds
            .map((id) => monitorNameMap.get(id))
            .filter(Boolean),
          updates: updates
            .sort((a, b) => a.createdAt - b.createdAt)
            .map((u) => ({
              status: u.status,
              message: u.message,
              createdAt: u.createdAt,
            })),
        };
      })
    );

    return withUpdates.sort((a, b) => b.startedAt - a.startedAt);
  },
});

export const getMonitorUptimeHistory = query({
  args: { orgSlug: v.string(), monitorId: v.id("statusMonitors") },
  handler: async (ctx, args) => {
    const org = await ctx.db
      .query("organizations")
      .filter((q) => q.eq(q.field("slug"), args.orgSlug))
      .unique();

    if (!org) {
      return null;
    }

    const monitor = await ctx.db.get(args.monitorId);
    if (!monitor || monitor.organizationId !== org._id || !monitor.isPublic) {
      return null;
    }

    // Get 90 days of checks, aggregate by day
    const ninetyDaysAgo = Date.now() - 90 * 24 * 60 * 60 * 1000;
    const checks = await ctx.db
      .query("statusChecks")
      .withIndex("by_monitor_time", (q) =>
        q.eq("monitorId", args.monitorId).gte("checkedAt", ninetyDaysAgo)
      )
      .collect();

    // Aggregate into daily buckets
    const dailyBuckets = new Map<
      string,
      { total: number; up: number; avgResponseTime: number }
    >();

    for (const check of checks) {
      const day = new Date(check.checkedAt).toISOString().split("T")[0];
      const bucket = dailyBuckets.get(day) ?? {
        total: 0,
        up: 0,
        avgResponseTime: 0,
      };
      bucket.total++;
      if (check.isUp) {
        bucket.up++;
      }
      bucket.avgResponseTime += check.responseTimeMs ?? 0;
      dailyBuckets.set(day, bucket);
    }

    const days = [...dailyBuckets.entries()]
      .map(([date, bucket]) => ({
        date,
        uptimePercentage:
          bucket.total > 0
            ? Math.round((bucket.up / bucket.total) * 10_000) / 100
            : 100,
        avgResponseTimeMs:
          bucket.total > 0
            ? Math.round(bucket.avgResponseTime / bucket.total)
            : 0,
        totalChecks: bucket.total,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return {
      monitorName: monitor.name,
      days,
    };
  },
});
