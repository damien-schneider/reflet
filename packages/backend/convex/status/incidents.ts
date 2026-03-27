import { v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { incidentSeverity, incidentStatus } from "./tableFields";

// ============================================
// QUERIES
// ============================================

export const getActiveIncidents = query({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    const incidents = await ctx.db
      .query("statusIncidents")
      .withIndex("by_org_status", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .collect();

    const activeIncidents = incidents.filter((i) => i.status !== "resolved");

    // Fetch updates and monitor names for each
    const withDetails = await Promise.all(
      activeIncidents.map(async (incident) => {
        const updates = await ctx.db
          .query("statusIncidentUpdates")
          .withIndex("by_incident", (q) => q.eq("incidentId", incident._id))
          .collect();

        const monitors = await Promise.all(
          incident.affectedMonitorIds.map((id) => ctx.db.get(id))
        );

        return {
          ...incident,
          updates: updates.sort((a, b) => b.createdAt - a.createdAt),
          affectedMonitors: monitors
            .filter((m): m is NonNullable<typeof m> => m !== null)
            .map((m) => ({ _id: m._id, name: m.name, url: m.url })),
        };
      })
    );

    return withDetails;
  },
});

export const getIncidentHistory = query({
  args: {
    organizationId: v.id("organizations"),
    days: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const daysBack = args.days ?? 14;
    const cutoff = Date.now() - daysBack * 24 * 60 * 60 * 1000;

    const incidents = await ctx.db
      .query("statusIncidents")
      .withIndex("by_org_created", (q) =>
        q.eq("organizationId", args.organizationId).gte("createdAt", cutoff)
      )
      .collect();

    const withUpdates = await Promise.all(
      incidents.map(async (incident) => {
        const updates = await ctx.db
          .query("statusIncidentUpdates")
          .withIndex("by_incident", (q) => q.eq("incidentId", incident._id))
          .collect();

        const monitors = await Promise.all(
          incident.affectedMonitorIds.map((id) => ctx.db.get(id))
        );

        return {
          ...incident,
          updates: updates.sort((a, b) => a.createdAt - b.createdAt),
          affectedMonitors: monitors
            .filter(Boolean)
            .filter((m): m is NonNullable<typeof m> => m !== null)
            .map((m) => ({ _id: m._id, name: m.name })),
        };
      })
    );

    return withUpdates.sort((a, b) => b.createdAt - a.createdAt);
  },
});

export const getIncidentWithUpdates = query({
  args: { incidentId: v.id("statusIncidents") },
  handler: async (ctx, args) => {
    const incident = await ctx.db.get(args.incidentId);
    if (!incident) {
      return null;
    }

    const updates = await ctx.db
      .query("statusIncidentUpdates")
      .withIndex("by_incident", (q) => q.eq("incidentId", args.incidentId))
      .collect();

    const monitors = await Promise.all(
      incident.affectedMonitorIds.map((id) => ctx.db.get(id))
    );

    return {
      ...incident,
      updates: updates.sort((a, b) => a.createdAt - b.createdAt),
      affectedMonitors: monitors
        .filter((m): m is NonNullable<typeof m> => m !== null)
        .map((m) => ({ _id: m._id, name: m.name, url: m.url })),
    };
  },
});

// ============================================
// MUTATIONS
// ============================================

export const createIncident = mutation({
  args: {
    organizationId: v.id("organizations"),
    title: v.string(),
    severity: incidentSeverity,
    affectedMonitorIds: v.array(v.id("statusMonitors")),
    message: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    const incidentId = await ctx.db.insert("statusIncidents", {
      organizationId: args.organizationId,
      title: args.title,
      severity: args.severity,
      status: "investigating",
      affectedMonitorIds: args.affectedMonitorIds,
      autoDetected: false,
      startedAt: now,
      createdAt: now,
      updatedAt: now,
    });

    await ctx.db.insert("statusIncidentUpdates", {
      incidentId,
      organizationId: args.organizationId,
      status: "investigating",
      message: args.message,
      createdAt: now,
    });

    return incidentId;
  },
});

export const postIncidentUpdate = mutation({
  args: {
    incidentId: v.id("statusIncidents"),
    status: incidentStatus,
    message: v.string(),
  },
  handler: async (ctx, args) => {
    const incident = await ctx.db.get(args.incidentId);
    if (!incident) {
      throw new Error("Incident not found");
    }

    const now = Date.now();

    await ctx.db.patch(args.incidentId, {
      status: args.status,
      updatedAt: now,
      ...(args.status === "resolved" ? { resolvedAt: now } : {}),
    });

    await ctx.db.insert("statusIncidentUpdates", {
      incidentId: args.incidentId,
      organizationId: incident.organizationId,
      status: args.status,
      message: args.message,
      createdAt: now,
    });
  },
});

export const resolveIncident = mutation({
  args: {
    incidentId: v.id("statusIncidents"),
    message: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const incident = await ctx.db.get(args.incidentId);
    if (!incident) {
      throw new Error("Incident not found");
    }

    const now = Date.now();

    await ctx.db.patch(args.incidentId, {
      status: "resolved",
      resolvedAt: now,
      updatedAt: now,
    });

    await ctx.db.insert("statusIncidentUpdates", {
      incidentId: args.incidentId,
      organizationId: incident.organizationId,
      status: "resolved",
      message: args.message ?? "This incident has been resolved.",
      createdAt: now,
    });
  },
});
