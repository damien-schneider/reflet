import { defineTable } from "convex/server";
import { v } from "convex/values";

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

export const alertChannelKind = v.union(
  v.literal("slack"),
  v.literal("discord"),
  v.literal("webhook")
);

const uptimeBucketFields = {
  bucketStart: v.number(),
  checks: v.number(),
  monitorId: v.id("statusMonitors"),
  responseTimeMsSum: v.number(),
  upChecks: v.number(),
};

export const statusTables = {
  statusAlertChannels: defineTable({
    createdAt: v.number(),
    kind: alertChannelKind,
    label: v.optional(v.string()),
    lastDelivery: v.optional(
      v.object({ deliveredAt: v.number(), error: v.optional(v.string()) })
    ),
    organizationId: v.id("organizations"),
    url: v.string(),
  }).index("by_organization", ["organizationId"]),
  statusChecks: defineTable({
    checkedAt: v.number(),
    errorMessage: v.optional(v.string()),
    isUp: v.boolean(),
    monitorId: v.id("statusMonitors"),
    organizationId: v.id("organizations"),
    responseTimeMs: v.optional(v.number()),
    statusCode: v.optional(v.number()),
  })
    .index("by_monitor_time", ["monitorId", "checkedAt"])
    .index("by_checked_at", ["checkedAt"]),

  statusIncidents: defineTable({
    affectedMonitorIds: v.array(v.id("statusMonitors")),
    autoDetected: v.boolean(),
    createdAt: v.number(),
    organizationId: v.id("organizations"),
    resolvedAt: v.optional(v.number()),
    severity: incidentSeverity,
    startedAt: v.number(),
    status: incidentStatus,
    subscribersNotifiedAt: v.optional(v.number()),
    title: v.string(),
    updatedAt: v.number(),
  })
    .index("by_organization", ["organizationId"])
    .index("by_org_status", ["organizationId", "status"])
    .index("by_org_created", ["organizationId", "createdAt"]),

  statusIncidentUpdates: defineTable({
    createdAt: v.number(),
    incidentId: v.id("statusIncidents"),
    message: v.string(),
    organizationId: v.id("organizations"),
    status: incidentStatus,
  }).index("by_incident", ["incidentId"]),

  statusMaintenances: defineTable({
    affectedMonitorIds: v.array(v.id("statusMonitors")),
    createdAt: v.number(),
    endsAt: v.number(),
    message: v.optional(v.string()),
    organizationId: v.id("organizations"),
    startsAt: v.number(),
    title: v.string(),
    updatedAt: v.number(),
  }).index("by_org_ends", ["organizationId", "endsAt"]),

  statusMonitors: defineTable({
    alertThreshold: v.number(),
    bodyKeyword: v.optional(v.string()),
    checkIntervalMinutes: v.number(),
    consecutiveFailures: v.number(),
    createdAt: v.number(),
    degradedResponseTimeMs: v.optional(v.number()),
    expectedStatusCodes: v.optional(v.array(v.number())),
    groupName: v.optional(v.string()),
    groupOrder: v.optional(v.number()),
    isPublic: v.boolean(),
    lastCheckedAt: v.optional(v.number()),
    lastResponseTimeMs: v.optional(v.number()),
    method: v.optional(monitorMethod),
    name: v.string(),
    order: v.optional(v.number()),
    organizationId: v.id("organizations"),
    status: monitorStatus,
    updatedAt: v.number(),
    url: v.string(),
  })
    .index("by_organization", ["organizationId"])
    .index("by_org_status", ["organizationId", "status"]),

  statusSubscribers: defineTable({
    confirmationToken: v.optional(v.string()),
    email: v.string(),
    organizationId: v.id("organizations"),
    subscribedAt: v.number(),
    unsubscribeToken: v.string(),
  })
    .index("by_organization", ["organizationId"])
    .index("by_email_org", ["email", "organizationId"])
    .index("by_unsubscribe_token", ["unsubscribeToken"])
    .index("by_confirmation_token", ["confirmationToken"]),

  statusUptimeDays: defineTable(uptimeBucketFields)
    .index("by_monitor_start", ["monitorId", "bucketStart"])
    .index("by_start", ["bucketStart"]),

  statusUptimeHours: defineTable(uptimeBucketFields)
    .index("by_monitor_start", ["monitorId", "bucketStart"])
    .index("by_start", ["bucketStart"]),
};
