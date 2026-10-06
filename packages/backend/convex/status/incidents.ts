import { v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { requireOrgAdmin, requireOrgMember } from "../shared/access";
import { MAX_DESCRIPTION_LENGTH, MAX_TITLE_LENGTH } from "../shared/constants";
import { validateInputLength } from "../shared/validators";
import { notifyIncidentChange } from "./incidentNotifications";
import { listActiveIncidents } from "./lib/activeIncidents";
import { incidentSeverity, incidentStatus } from "./tableFields";

export const getActiveIncidents = query({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    await requireOrgMember(ctx, args.organizationId);

    const activeIncidents = await listActiveIncidents(ctx, args.organizationId);

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
    validateInputLength(args.title, MAX_TITLE_LENGTH, "Title");
    validateInputLength(args.message, MAX_DESCRIPTION_LENGTH, "Message");

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
    validateInputLength(args.message, MAX_DESCRIPTION_LENGTH, "Message");

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
