/**
 * Concurrent Context Gatherer — cross-role knowledge sharing.
 *
 * When a role skill is working on a topic, it can query what other role skills
 * know about that topic. This enables informed decision-making across
 * the entire runtime.
 */

import { v } from "convex/values";
import { internalQuery } from "../_generated/server";
import { SEVEN_DAYS_MS } from "../shared/constants";
import { isRoleSkillEnabledInConfig } from "./config";

/**
 * Gather context from all role skills about a specific topic.
 *
 * Searches recent activity logs, inbox items, tasks, and intelligence signals
 * for mentions of the topic keywords. Returns a per-role summary.
 */
export const gatherConcurrentContext = internalQuery({
  args: {
    organizationId: v.id("organizations"),
    keywords: v.array(v.string()),
    excludeRole: v.optional(v.string()),
  },
  returns: v.array(
    v.object({
      role: v.string(),
      relevantFindings: v.array(v.string()),
    })
  ),
  handler: async (ctx, args) => {
    const normalizedKeywords = args.keywords.map((k) => k.toLowerCase());

    const matchesKeyword = (text: string): boolean => {
      const lowerText = text.toLowerCase();
      return normalizedKeywords.some((kw) => lowerText.includes(kw));
    };

    // 1. Search recent activity log (last 7 days)
    const sevenDaysAgo = Date.now() - SEVEN_DAYS_MS;
    const activities = await ctx.db
      .query("autopilotActivityLog")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .collect();

    const recentActivities = activities.filter(
      (a) => a.createdAt >= sevenDaysAgo
    );

    // 2. Search recent documents
    const documents = await ctx.db
      .query("autopilotDocuments")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .collect();

    const recentDocs = documents.filter((doc) => doc.createdAt >= sevenDaysAgo);

    // 3. Search active work items
    const workItems = await ctx.db
      .query("autopilotWorkItems")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .collect();

    const activeItems = workItems.filter(
      (t) => t.status !== "done" && t.status !== "cancelled"
    );

    const roleContextMap = new Map<string, string[]>();

    const addFinding = (role: string, finding: string) => {
      if (role === args.excludeRole) {
        return;
      }
      const existing = roleContextMap.get(role) ?? [];
      // Limit to 5 findings per role skill
      if (existing.length < 5) {
        existing.push(finding);
      }
      roleContextMap.set(role, existing);
    };

    // Match activities
    for (const activity of recentActivities) {
      if (matchesKeyword(activity.message)) {
        addFinding(activity.role, activity.message);
      }
    }

    // Match documents
    for (const doc of recentDocs) {
      const searchable = `${doc.title} ${doc.content ?? ""}`;
      if (matchesKeyword(searchable)) {
        addFinding(doc.sourceRole ?? "system", `[Doc] ${doc.title}`);
      }
    }

    // Match work items
    for (const item of activeItems) {
      const searchable = `${item.title} ${item.description}`;
      if (matchesKeyword(searchable)) {
        addFinding(
          item.assignedRole ?? "system",
          `[WorkItem:${item.status}] ${item.title}`
        );
      }
    }

    // Convert map to array
    const results: Array<{
      role: string;
      relevantFindings: string[];
    }> = [];
    for (const [role, findings] of roleContextMap) {
      results.push({ role, relevantFindings: findings });
    }

    return results;
  },
});

/**
 * Get a brief status summary for all role skills.
 * Used by CEO for coordination overview.
 */
export const getAllRoleSkillStatus = internalQuery({
  args: { organizationId: v.id("organizations") },
  returns: v.array(
    v.object({
      role: v.string(),
      enabled: v.boolean(),
      recentActivityCount: v.number(),
      pendingInboxCount: v.number(),
      activeTaskCount: v.number(),
    })
  ),
  handler: async (ctx, args) => {
    const config = await ctx.db
      .query("autopilotConfig")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .unique();

    if (!config) {
      return [];
    }

    const roles = ["pm", "cto", "growth", "support", "sales"] as const;

    const oneHourAgo = Date.now() - 60 * 60 * 1000;

    const activities = await ctx.db
      .query("autopilotActivityLog")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .collect();

    const reviewItems = await ctx.db
      .query("autopilotWorkItems")
      .withIndex("by_org_review", (q) =>
        q.eq("organizationId", args.organizationId).eq("needsReview", true)
      )
      .collect();

    const workItems = await ctx.db
      .query("autopilotWorkItems")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .collect();

    return roles.map((role) => {
      const enabled = isRoleSkillEnabledInConfig(role, config);

      const recentActivityCount = activities.filter(
        (a) => a.role === role && a.createdAt >= oneHourAgo
      ).length;

      const pendingInboxCount = reviewItems.filter(
        (item) => item.assignedRole === role
      ).length;

      const activeTaskCount = workItems.filter(
        (t) =>
          t.assignedRole === role &&
          t.status !== "done" &&
          t.status !== "cancelled"
      ).length;

      return {
        role,
        enabled,
        recentActivityCount,
        pendingInboxCount,
        activeTaskCount,
      };
    });
  },
});
