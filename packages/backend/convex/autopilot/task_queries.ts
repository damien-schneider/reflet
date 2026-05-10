/**
 * Work item queries — read-only access to autopilot work items, runs, and activity.
 */

import { v } from "convex/values";
import type { Doc } from "../_generated/dataModel";
import { internalQuery } from "../_generated/server";
import {
  domainStatus,
  feedbackStatus,
  subscriptionStatus,
  subscriptionTier,
} from "../shared/validators";
import {
  activityEntityType,
  activityLogLevel,
  assignedAgent,
  codingAdapterType,
  priority,
  runStatus,
  workItemStatus,
  workItemType,
} from "./schema/validators";

const organizationValidator = v.object({
  _creationTime: v.number(),
  _id: v.id("organizations"),
  changelogSettings: v.optional(
    v.object({
      autoPublishImported: v.optional(v.boolean()),
      autoVersioning: v.optional(v.boolean()),
      pushToGithubOnPublish: v.optional(v.boolean()),
      syncDirection: v.optional(v.string()),
      targetBranch: v.optional(v.string()),
      versionIncrement: v.optional(v.string()),
      versionPrefix: v.optional(v.string()),
    })
  ),
  createdAt: v.number(),
  customCss: v.optional(v.string()),
  customDomain: v.optional(v.string()),
  customDomainError: v.optional(v.string()),
  customDomainLastCheckedAt: v.optional(v.number()),
  customDomainStatus: v.optional(domainStatus),
  customDomainVerification: v.optional(
    v.array(
      v.object({
        domain: v.string(),
        reason: v.optional(v.string()),
        type: v.string(),
        value: v.string(),
      })
    )
  ),
  feedbackSettings: v.optional(
    v.object({
      allowAnonymousVoting: v.optional(v.boolean()),
      cardStyle: v.optional(
        v.union(
          v.literal("sweep-corner"),
          v.literal("minimal-notch"),
          v.literal("editorial-feed")
        )
      ),
      defaultStatus: v.optional(feedbackStatus),
      defaultTagId: v.optional(v.id("tags")),
      defaultView: v.optional(v.union(v.literal("roadmap"), v.literal("feed"))),
      milestoneStyle: v.optional(
        v.union(
          v.literal("track"),
          v.literal("editorial-accordion"),
          v.literal("dashboard-timeline")
        )
      ),
      requireApproval: v.optional(v.boolean()),
    })
  ),
  hideBranding: v.optional(v.boolean()),
  isPublic: v.boolean(),
  logo: v.optional(v.string()),
  name: v.string(),
  primaryColor: v.optional(v.string()),
  setupCompleted: v.optional(v.boolean()),
  setupMethod: v.optional(
    v.union(v.literal("github"), v.literal("manual"), v.literal("skipped"))
  ),
  slug: v.string(),
  staleFeedbackSettings: v.optional(
    v.object({
      action: v.union(v.literal("archive"), v.literal("close")),
      daysInactive: v.number(),
      enabled: v.boolean(),
      excludeStatuses: v.optional(v.array(feedbackStatus)),
    })
  ),
  stripeCustomerId: v.optional(v.string()),
  stripeSubscriptionId: v.optional(v.string()),
  subscriptionStatus,
  subscriptionTier,
  supportEnabled: v.optional(v.boolean()),
});

const workItemValidator = v.object({
  _creationTime: v.number(),
  _id: v.id("autopilotWorkItems"),
  acceptanceCriteria: v.optional(v.array(v.string())),
  assignedAgent: v.optional(assignedAgent),
  branch: v.optional(v.string()),
  completionPercent: v.optional(v.number()),
  createdAt: v.number(),
  createdBy: v.optional(v.string()),
  createdByUser: v.optional(v.string()),
  description: v.string(),
  includeInChangelog: v.optional(v.boolean()),
  isPublicRoadmap: v.optional(v.boolean()),
  needsReview: v.boolean(),
  organizationId: v.id("organizations"),
  parentId: v.optional(v.id("autopilotWorkItems")),
  prNumber: v.optional(v.number()),
  prUrl: v.optional(v.string()),
  priority,
  reviewedAt: v.optional(v.number()),
  reviewType: v.optional(v.string()),
  status: workItemStatus,
  tags: v.optional(v.array(v.string())),
  title: v.string(),
  type: workItemType,
  updatedAt: v.number(),
});

const runValidator = v.object({
  _creationTime: v.number(),
  _id: v.id("autopilotRuns"),
  adapter: codingAdapterType,
  branch: v.optional(v.string()),
  ciFailureLog: v.optional(v.string()),
  ciStatus: v.optional(
    v.union(
      v.literal("pending"),
      v.literal("running"),
      v.literal("passed"),
      v.literal("failed")
    )
  ),
  completedAt: v.optional(v.number()),
  errorMessage: v.optional(v.string()),
  estimatedCostUsd: v.number(),
  externalRef: v.optional(v.string()),
  organizationId: v.id("organizations"),
  prNumber: v.optional(v.number()),
  prUrl: v.optional(v.string()),
  startedAt: v.number(),
  status: runStatus,
  tokensUsed: v.number(),
  workItemId: v.id("autopilotWorkItems"),
});

const activityLogValidator = v.object({
  _creationTime: v.number(),
  _id: v.id("autopilotActivityLog"),
  action: v.optional(v.string()),
  agent: assignedAgent,
  createdAt: v.number(),
  details: v.optional(v.string()),
  entityId: v.optional(v.string()),
  entityType: v.optional(activityEntityType),
  level: activityLogLevel,
  message: v.string(),
  organizationId: v.id("organizations"),
  runId: v.optional(v.id("autopilotRuns")),
  targetAgent: v.optional(assignedAgent),
  workItemId: v.optional(v.id("autopilotWorkItems")),
});

const PRIORITY_RANK = {
  critical: 0,
  high: 1,
  low: 3,
  medium: 2,
} satisfies Record<Doc<"autopilotWorkItems">["priority"], number>;

const compareWorkItemPriority = (
  a: Doc<"autopilotWorkItems">,
  b: Doc<"autopilotWorkItems">
) => PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];

/**
 * Get an organization by ID (for use by autopilot actions which lack ctx.db).
 */
export const getOrganization = internalQuery({
  args: { id: v.id("organizations") },
  returns: v.union(organizationValidator, v.null()),
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

/**
 * Get all todo work items for an org, ordered by priority.
 */
export const getPendingTasks = internalQuery({
  args: { organizationId: v.id("organizations") },
  returns: v.array(workItemValidator),
  handler: async (ctx, args) => {
    const items = await ctx.db
      .query("autopilotWorkItems")
      .withIndex("by_org_status", (q) =>
        q.eq("organizationId", args.organizationId).eq("status", "todo")
      )
      .collect();

    return items.sort(compareWorkItemPriority);
  },
});

/**
 * Get work items that are ready to dispatch (todo + not blocked by parent).
 */
export const getDispatchableTasks = internalQuery({
  args: { organizationId: v.id("organizations") },
  returns: v.array(workItemValidator),
  handler: async (ctx, args) => {
    const todoItems = await ctx.db
      .query("autopilotWorkItems")
      .withIndex("by_org_status", (q) =>
        q.eq("organizationId", args.organizationId).eq("status", "todo")
      )
      .collect();

    const dispatchable: Doc<"autopilotWorkItems">[] = [];

    for (const item of todoItems) {
      if (item.parentId) {
        const parent = await ctx.db.get(item.parentId);
        if (parent && parent.status !== "done") {
          continue;
        }
      }
      dispatchable.push(item);
    }

    return dispatchable.sort(compareWorkItemPriority);
  },
});

/**
 * Get a work item by ID.
 */
export const getTask = internalQuery({
  args: { taskId: v.id("autopilotWorkItems") },
  returns: v.union(workItemValidator, v.null()),
  handler: async (ctx, args) => ctx.db.get(args.taskId),
});

/**
 * Get children for a parent work item.
 */
export const getSubtasks = internalQuery({
  args: { parentTaskId: v.id("autopilotWorkItems") },
  returns: v.array(workItemValidator),
  handler: async (ctx, args) =>
    ctx.db
      .query("autopilotWorkItems")
      .withIndex("by_parent", (q) => q.eq("parentId", args.parentTaskId))
      .collect(),
});

/**
 * Get all work items for an org (for the dashboard).
 */
export const getTasksByOrg = internalQuery({
  args: {
    organizationId: v.id("organizations"),
    status: v.optional(workItemStatus),
  },
  returns: v.array(workItemValidator),
  handler: async (ctx, args) => {
    if (args.status) {
      const { status } = args;
      return await ctx.db
        .query("autopilotWorkItems")
        .withIndex("by_org_status", (q) =>
          q.eq("organizationId", args.organizationId).eq("status", status)
        )
        .collect();
    }

    return await ctx.db
      .query("autopilotWorkItems")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .collect();
  },
});

/**
 * Get active runs for a work item.
 */
export const getRunsForTask = internalQuery({
  args: { taskId: v.id("autopilotWorkItems") },
  returns: v.array(runValidator),
  handler: async (ctx, args) =>
    ctx.db
      .query("autopilotRuns")
      .withIndex("by_work_item", (q) => q.eq("workItemId", args.taskId))
      .collect(),
});

/**
 * Get one coding run by ID.
 */
export const getRun = internalQuery({
  args: { runId: v.id("autopilotRuns") },
  returns: v.union(runValidator, v.null()),
  handler: async (ctx, args) => ctx.db.get(args.runId),
});

/**
 * Get recent activity for an org (for the live feed).
 */
export const getRecentActivity = internalQuery({
  args: {
    organizationId: v.id("organizations"),
    limit: v.optional(v.number()),
  },
  returns: v.array(activityLogValidator),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("autopilotActivityLog")
      .withIndex("by_org_created", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .order("desc")
      .take(args.limit ?? 50);
  },
});
