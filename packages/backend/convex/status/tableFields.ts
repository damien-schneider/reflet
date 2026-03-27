import { defineTable } from "convex/server";
import { v } from "convex/values";

// ============================================
// STATUS VALIDATORS
// ============================================

export const monitorStatus = v.union(
  v.literal("operational"),
  v.literal("degraded"),
  v.literal("major_outage"),
  v.literal("paused")
);

export const monitorMethod = v.union(v.literal("GET"), v.literal("HEAD"));

export const incidentSeverity = v.union(
  v.literal("minor"),
  v.literal("major"),
  v.literal("critical")
);

export const incidentStatus = v.union(
  v.literal("investigating"),
  v.literal("identified"),
  v.literal("monitoring"),
  v.literal("resolved")
);

// ============================================
// STATUS TABLES
// ============================================

export const statusTables = {
  statusMonitors: defineTable({
    organizationId: v.id("organizations"),
    name: v.string(),
    url: v.string(),
    method: v.optional(monitorMethod),
    checkIntervalMinutes: v.number(),
    alertThreshold: v.number(),
    status: monitorStatus,
    consecutiveFailures: v.number(),
    lastCheckedAt: v.optional(v.number()),
    lastResponseTimeMs: v.optional(v.number()),
    isPublic: v.boolean(),
    groupName: v.optional(v.string()),
    groupOrder: v.optional(v.number()),
    order: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_organization", ["organizationId"])
    .index("by_org_status", ["organizationId", "status"]),

  statusChecks: defineTable({
    monitorId: v.id("statusMonitors"),
    organizationId: v.id("organizations"),
    statusCode: v.optional(v.number()),
    responseTimeMs: v.optional(v.number()),
    isUp: v.boolean(),
    errorMessage: v.optional(v.string()),
    checkedAt: v.number(),
  })
    .index("by_monitor", ["monitorId"])
    .index("by_monitor_time", ["monitorId", "checkedAt"])
    .index("by_org_time", ["organizationId", "checkedAt"]),

  statusIncidents: defineTable({
    organizationId: v.id("organizations"),
    title: v.string(),
    severity: incidentSeverity,
    status: incidentStatus,
    affectedMonitorIds: v.array(v.id("statusMonitors")),
    autoDetected: v.boolean(),
    startedAt: v.number(),
    resolvedAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_organization", ["organizationId"])
    .index("by_org_status", ["organizationId", "status"])
    .index("by_org_created", ["organizationId", "createdAt"]),

  statusIncidentUpdates: defineTable({
    incidentId: v.id("statusIncidents"),
    organizationId: v.id("organizations"),
    status: incidentStatus,
    message: v.string(),
    createdAt: v.number(),
  }).index("by_incident", ["incidentId"]),

  statusSubscribers: defineTable({
    organizationId: v.id("organizations"),
    email: v.string(),
    unsubscribeToken: v.string(),
    subscribedAt: v.number(),
  })
    .index("by_organization", ["organizationId"])
    .index("by_email_org", ["email", "organizationId"])
    .index("by_unsubscribe_token", ["unsubscribeToken"]),
};
