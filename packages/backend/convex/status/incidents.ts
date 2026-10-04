import { v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { requireOrgAdmin, requireOrgMember } from "../shared/access";
import { notifyIncidentChange } from "./incidentNotifications";
import { listActiveIncidents } from "./lib/activeIncidents";
import { incidentSeverity, incidentStatus } from "./tableFields";

export const getActiveIncidents = query({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    await requireOrgMember(ctx, args.organizationId);

    const activeIncidents = await listActiveIncidents(ctx, args.organizationId);

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
          affectedMonitors: monitors
            .filter(
              (m): m is NonNullable<typeof m> =>
                m?.organizationId === incident.organizationId
            )
            .map((m) => ({ _id: m._id, name: m.name, url: m.url })),
          updates: updates.sort((a, b) => b.createdAt - a.createdAt),
        };
      })
    );

    return withDetails;
  },
});

export const getIncidentHistory = query({
  args: {
    days: v.optional(v.number()),
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    await requireOrgMember(ctx, args.organizationId);

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
          affectedMonitors: monitors
            .filter(
              (m): m is NonNullable<typeof m> =>
                m?.organizationId === incident.organizationId
            )
            .map((m) => ({ _id: m._id, name: m.name })),
          updates: updates.sort((a, b) => a.createdAt - b.createdAt),
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

    await requireOrgMember(ctx, incident.organizationId);

    const updates = await ctx.db
      .query("statusIncidentUpdates")
      .withIndex("by_incident", (q) => q.eq("incidentId", args.incidentId))
      .collect();

    const monitors = await Promise.all(
      incident.affectedMonitorIds.map((id) => ctx.db.get(id))
    );

    return {
      ...incident,
      affectedMonitors: monitors
        .filter(
          (m): m is NonNullable<typeof m> =>
            m?.organizationId === incident.organizationId
        )
        .map((m) => ({ _id: m._id, name: m.name, url: m.url })),
      updates: updates.sort((a, b) => a.createdAt - b.createdAt),
    };
  },
});

export const createIncident = mutation({
  args: {
    affectedMonitorIds: v.array(v.id("statusMonitors")),
    message: v.string(),
    organizationId: v.id("organizations"),
    severity: incidentSeverity,
    title: v.string(),
  },
  handler: async (ctx, args) => {
    await requireOrgAdmin(ctx, args.organizationId, "declare incidents");

    for (const monitorId of args.affectedMonitorIds) {
      const monitor = await ctx.db.get(monitorId);
      if (monitor?.organizationId !== args.organizationId) {
        throw new Error("Monitor not found");
      }
    }

    const now = Date.now();

    const incidentId = await ctx.db.insert("statusIncidents", {
      affectedMonitorIds: args.affectedMonitorIds,
      autoDetected: false,
      createdAt: now,
      organizationId: args.organizationId,
      severity: args.severity,
      startedAt: now,
      status: "investigating",
      title: args.title,
      updatedAt: now,
    });

    const updateId = await ctx.db.insert("statusIncidentUpdates", {
      createdAt: now,
      incidentId,
      message: args.message,
      organizationId: args.organizationId,
      status: "investigating",
    });
    await notifyIncidentChange(ctx, { incidentId, updateId });

    return incidentId;
  },
});

export const postIncidentUpdate = mutation({
  args: {
    incidentId: v.id("statusIncidents"),
    message: v.string(),
    status: incidentStatus,
  },
  handler: async (ctx, args) => {
    const incident = await ctx.db.get(args.incidentId);
    if (!incident) {
      throw new Error("Incident not found");
    }

    await requireOrgAdmin(
      ctx,
      incident.organizationId,
      "post incident updates"
    );

    const now = Date.now();

    await ctx.db.patch(args.incidentId, {
      status: args.status,
      updatedAt: now,
      ...(args.status === "resolved" ? { resolvedAt: now } : {}),
    });

    const updateId = await ctx.db.insert("statusIncidentUpdates", {
      createdAt: now,
      incidentId: args.incidentId,
      message: args.message,
      organizationId: incident.organizationId,
      status: args.status,
    });
    await notifyIncidentChange(ctx, { incidentId: args.incidentId, updateId });
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

    await requireOrgAdmin(ctx, incident.organizationId, "resolve incidents");

    const now = Date.now();

    await ctx.db.patch(args.incidentId, {
      resolvedAt: now,
      status: "resolved",
      updatedAt: now,
    });

    const updateId = await ctx.db.insert("statusIncidentUpdates", {
      createdAt: now,
      incidentId: args.incidentId,
      message: args.message ?? "This incident has been resolved.",
      organizationId: incident.organizationId,
      status: "resolved",
    });
    await notifyIncidentChange(ctx, { incidentId: args.incidentId, updateId });
  },
});
