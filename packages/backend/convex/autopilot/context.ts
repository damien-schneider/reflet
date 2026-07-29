/**
 * Concurrent Context Gatherer — cross-role knowledge sharing.
 *
 * When a role skill is working on a topic, it can query what other role skills
 * know about that topic. This enables informed decision-making across
 * the entire runtime.
 */

import { v } from "convex/values";
import { internalQuery } from "../_generated/server";
import { isRoleSkillEnabledInConfig } from "./config";

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
