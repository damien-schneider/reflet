/**
 * Public queries for the Autopilot frontend.
 *
 * All queries authenticate the user and verify org membership
 * before returning data. Read-only.
 */

import { v } from "convex/values";
import type { Id } from "../_generated/dataModel";
import { type QueryCtx, query } from "../_generated/server";
import { getAuthUser } from "../shared/utils";
import {
  autopilotTaskStatus,
  emailDirection,
  emailStatus,
  growthItemStatus,
  growthItemType,
  inboxItemStatus,
  inboxItemType,
  leadStatus,
} from "./tableFields";

// ============================================
// HELPERS
// ============================================

const requireOrgMembership = async (
  ctx: QueryCtx,
  organizationId: Id<"organizations">,
  userId: string
) => {
  const membership = await ctx.db
    .query("organizationMembers")
    .withIndex("by_org_user", (q) =>
      q.eq("organizationId", organizationId).eq("userId", userId)
    )
    .unique();

  if (!membership) {
    throw new Error("Not a member of this organization");
  }

  return membership;
};

// ============================================
// CONFIG
// ============================================

export const getConfig = query({
  args: { organizationId: v.id("organizations") },
  returns: v.union(
    v.object({
      _id: v.id("autopilotConfig"),
      _creationTime: v.number(),
      adapter: v.string(),
      autonomyLevel: v.string(),
      autoMergePRs: v.boolean(),
      ceoChatThreadId: v.optional(v.string()),
      costUsedTodayUsd: v.optional(v.number()),
      createdAt: v.number(),
      dailyCostCapUsd: v.optional(v.number()),
      emailBlocklist: v.optional(v.array(v.string())),
      emailDailyLimit: v.optional(v.number()),
      enabled: v.boolean(),
      intelligenceEnabled: v.optional(v.boolean()),
      pmEnabled: v.optional(v.boolean()),
      ctoEnabled: v.optional(v.boolean()),
      devEnabled: v.optional(v.boolean()),
      securityEnabled: v.optional(v.boolean()),
      architectEnabled: v.optional(v.boolean()),
      growthEnabled: v.optional(v.boolean()),
      supportEnabled: v.optional(v.boolean()),
      analyticsEnabled: v.optional(v.boolean()),
      docsEnabled: v.optional(v.boolean()),
      qaEnabled: v.optional(v.boolean()),
      opsEnabled: v.optional(v.boolean()),
      salesEnabled: v.optional(v.boolean()),
      autonomyMode: v.optional(v.string()),
      stoppedAt: v.optional(v.number()),
      fullAutoDelay: v.optional(v.number()),
      autoMergeThreshold: v.optional(v.number()),
      maxTasksPerDay: v.number(),
      organizationId: v.id("organizations"),
      orgEmailAddress: v.optional(v.string()),
      requireArchitectReview: v.boolean(),
      tasksResetAt: v.number(),
      tasksUsedToday: v.number(),
      updatedAt: v.number(),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);
    await requireOrgMembership(ctx, args.organizationId, user._id);

    const config = await ctx.db
      .query("autopilotConfig")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .unique();

    return config;
  },
});

// ============================================
// TASKS
// ============================================

export const listTasks = query({
  args: {
    organizationId: v.id("organizations"),
    status: v.optional(autopilotTaskStatus),
  },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);
    await requireOrgMembership(ctx, args.organizationId, user._id);

    if (args.status) {
      const status = args.status;
      return ctx.db
        .query("autopilotTasks")
        .withIndex("by_org_status", (q) =>
          q.eq("organizationId", args.organizationId).eq("status", status)
        )
        .collect();
    }

    return ctx.db
      .query("autopilotTasks")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .collect();
  },
});

export const getTask = query({
  args: { taskId: v.id("autopilotTasks") },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);
    const task = await ctx.db.get(args.taskId);
    if (!task) {
      return null;
    }

    await requireOrgMembership(ctx, task.organizationId, user._id);
    return task;
  },
});

export const getSubtasks = query({
  args: { parentTaskId: v.id("autopilotTasks") },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);
    const parent = await ctx.db.get(args.parentTaskId);
    if (!parent) {
      return [];
    }

    await requireOrgMembership(ctx, parent.organizationId, user._id);

    return ctx.db
      .query("autopilotTasks")
      .withIndex("by_parent", (q) => q.eq("parentTaskId", args.parentTaskId))
      .collect();
  },
});

export const getTaskRuns = query({
  args: { taskId: v.id("autopilotTasks") },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);
    const task = await ctx.db.get(args.taskId);
    if (!task) {
      return [];
    }

    await requireOrgMembership(ctx, task.organizationId, user._id);

    return ctx.db
      .query("autopilotRuns")
      .withIndex("by_task", (q) => q.eq("taskId", args.taskId))
      .collect();
  },
});

// ============================================
// ACTIVITY LOG
// ============================================

export const listActivity = query({
  args: {
    organizationId: v.id("organizations"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);
    await requireOrgMembership(ctx, args.organizationId, user._id);

    return ctx.db
      .query("autopilotActivityLog")
      .withIndex("by_org_created", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .order("desc")
      .take(args.limit ?? 50);
  },
});

// ============================================
// INBOX
// ============================================

export const listInboxItems = query({
  args: {
    organizationId: v.id("organizations"),
    limit: v.optional(v.number()),
    status: v.optional(inboxItemStatus),
    type: v.optional(inboxItemType),
  },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);
    await requireOrgMembership(ctx, args.organizationId, user._id);

    const limit = args.limit ?? 50;

    if (args.status) {
      const { status } = args;
      return ctx.db
        .query("autopilotInboxItems")
        .withIndex("by_org_status", (q) =>
          q.eq("organizationId", args.organizationId).eq("status", status)
        )
        .order("desc")
        .take(limit);
    }

    if (args.type) {
      const { type } = args;
      return ctx.db
        .query("autopilotInboxItems")
        .withIndex("by_org_type", (q) =>
          q.eq("organizationId", args.organizationId).eq("type", type)
        )
        .order("desc")
        .take(limit);
    }

    return ctx.db
      .query("autopilotInboxItems")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .order("desc")
      .take(limit);
  },
});

export const getInboxCounts = query({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);
    await requireOrgMembership(ctx, args.organizationId, user._id);

    const items = await ctx.db
      .query("autopilotInboxItems")
      .withIndex("by_org_status", (q) =>
        q.eq("organizationId", args.organizationId).eq("status", "pending")
      )
      .collect();

    const counts: Record<string, number> = {};
    let total = 0;

    for (const item of items) {
      counts[item.type] = (counts[item.type] ?? 0) + 1;
      total += 1;
    }

    return { counts, total };
  },
});

// ============================================
// GROWTH ITEMS
// ============================================

export const listGrowthItems = query({
  args: {
    organizationId: v.id("organizations"),
    limit: v.optional(v.number()),
    status: v.optional(growthItemStatus),
    type: v.optional(growthItemType),
  },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);
    await requireOrgMembership(ctx, args.organizationId, user._id);

    const limit = args.limit ?? 50;

    if (args.status) {
      const { status } = args;
      return ctx.db
        .query("autopilotGrowthItems")
        .withIndex("by_org_status", (q) =>
          q.eq("organizationId", args.organizationId).eq("status", status)
        )
        .order("desc")
        .take(limit);
    }

    if (args.type) {
      const { type } = args;
      return ctx.db
        .query("autopilotGrowthItems")
        .withIndex("by_org_type", (q) =>
          q.eq("organizationId", args.organizationId).eq("type", type)
        )
        .order("desc")
        .take(limit);
    }

    return ctx.db
      .query("autopilotGrowthItems")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .order("desc")
      .take(limit);
  },
});

// ============================================
// EMAILS
// ============================================

export const listEmails = query({
  args: {
    organizationId: v.id("organizations"),
    direction: v.optional(emailDirection),
    limit: v.optional(v.number()),
    status: v.optional(emailStatus),
  },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);
    await requireOrgMembership(ctx, args.organizationId, user._id);

    const limit = args.limit ?? 50;

    if (args.direction) {
      const { direction } = args;
      const emails = await ctx.db
        .query("autopilotEmails")
        .withIndex("by_org_direction", (q) =>
          q.eq("organizationId", args.organizationId).eq("direction", direction)
        )
        .order("desc")
        .take(limit);

      if (args.status) {
        return emails.filter((e) => e.status === args.status);
      }
      return emails;
    }

    return ctx.db
      .query("autopilotEmails")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .order("desc")
      .take(limit);
  },
});

export const getEmailThread = query({
  args: { threadId: v.string() },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);

    const emails = await ctx.db
      .query("autopilotEmails")
      .withIndex("by_thread", (q) => q.eq("threadId", args.threadId))
      .order("asc")
      .collect();

    if (emails.length === 0) {
      return [];
    }

    await requireOrgMembership(ctx, emails[0].organizationId, user._id);
    return emails;
  },
});

export const getEmail = query({
  args: { emailId: v.id("autopilotEmails") },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);
    const email = await ctx.db.get(args.emailId);

    if (!email) {
      return null;
    }

    await requireOrgMembership(ctx, email.organizationId, user._id);
    return email;
  },
});

// ============================================
// REVENUE
// ============================================

export const getLatestRevenue = query({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);
    await requireOrgMembership(ctx, args.organizationId, user._id);

    const snapshots = await ctx.db
      .query("autopilotRevenueSnapshots")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .order("desc")
      .take(1);

    return snapshots[0] ?? null;
  },
});

export const getRevenueHistory = query({
  args: {
    organizationId: v.id("organizations"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);
    await requireOrgMembership(ctx, args.organizationId, user._id);

    return ctx.db
      .query("autopilotRevenueSnapshots")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .order("desc")
      .take(args.limit ?? 30);
  },
});

// ============================================
// DASHBOARD STATS
// ============================================

export const getDashboardStats = query({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);
    await requireOrgMembership(ctx, args.organizationId, user._id);

    const config = await ctx.db
      .query("autopilotConfig")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .unique();

    const pendingTasks = await ctx.db
      .query("autopilotTasks")
      .withIndex("by_org_status", (q) =>
        q.eq("organizationId", args.organizationId).eq("status", "pending")
      )
      .collect();

    const inProgressTasks = await ctx.db
      .query("autopilotTasks")
      .withIndex("by_org_status", (q) =>
        q.eq("organizationId", args.organizationId).eq("status", "in_progress")
      )
      .collect();

    const completedTasks = await ctx.db
      .query("autopilotTasks")
      .withIndex("by_org_status", (q) =>
        q.eq("organizationId", args.organizationId).eq("status", "completed")
      )
      .collect();

    const pendingInbox = await ctx.db
      .query("autopilotInboxItems")
      .withIndex("by_org_status", (q) =>
        q.eq("organizationId", args.organizationId).eq("status", "pending")
      )
      .collect();

    return {
      enabled: config?.enabled ?? false,
      adapter: config?.adapter ?? "builtin",
      autonomyLevel: config?.autonomyLevel ?? "review_required",
      autonomyMode: config?.autonomyMode ?? "supervised",
      tasksUsedToday: config?.tasksUsedToday ?? 0,
      maxTasksPerDay: config?.maxTasksPerDay ?? 10,
      costUsedTodayUsd: config?.costUsedTodayUsd ?? 0,
      dailyCostCapUsd: config?.dailyCostCapUsd,
      pendingTaskCount: pendingTasks.length,
      inProgressTaskCount: inProgressTasks.length,
      completedTaskCount: completedTasks.length,
      pendingInboxCount: pendingInbox.length,
    };
  },
});

// ============================================
// LEADS (V6)
// ============================================

export const listLeads = query({
  args: {
    organizationId: v.id("organizations"),
    status: v.optional(leadStatus),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);
    await requireOrgMembership(ctx, args.organizationId, user._id);

    const limit = args.limit ?? 50;

    if (args.status) {
      const { status } = args;
      return ctx.db
        .query("autopilotLeads")
        .withIndex("by_org_status", (q) =>
          q.eq("organizationId", args.organizationId).eq("status", status)
        )
        .order("desc")
        .take(limit);
    }

    return ctx.db
      .query("autopilotLeads")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .order("desc")
      .take(limit);
  },
});

// ============================================
// AGENT THREADS (V6)
// ============================================

export const listAgentThreads = query({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);
    await requireOrgMembership(ctx, args.organizationId, user._id);

    return ctx.db
      .query("autopilotAgentThreads")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .collect();
  },
});

export const getThreadMessages = query({
  args: {
    threadId: v.id("autopilotAgentThreads"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);
    const thread = await ctx.db.get(args.threadId);
    if (!thread) {
      return [];
    }

    await requireOrgMembership(ctx, thread.organizationId, user._id);

    return ctx.db
      .query("autopilotAgentMessages")
      .withIndex("by_thread", (q) => q.eq("threadId", args.threadId))
      .order("desc")
      .take(args.limit ?? 100);
  },
});
