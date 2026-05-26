/**
 * Role-Skill Scoring — derives per-role performance metrics from activity logs.
 *
 * Metrics: output rate, success/failure ratio, cost efficiency,
 * review approval rate. Used by heartbeat for smart prioritization.
 */

import { v } from "convex/values";
import { internalQuery } from "../_generated/server";
import { SEVEN_DAYS_MS } from "../shared/constants";
import { assignedRole } from "./schema/validators";

const SCORING_WINDOW_MS = SEVEN_DAYS_MS;

export const getRoleScore = internalQuery({
  args: {
    organizationId: v.id("organizations"),
    role: assignedRole,
  },
  returns: v.object({
    role: v.string(),
    totalActions: v.number(),
    successCount: v.number(),
    errorCount: v.number(),
    successRate: v.number(),
    documentsCreated: v.number(),
    documentsApproved: v.number(),
    approvalRate: v.number(),
  }),
  handler: async (ctx, args) => {
    const cutoff = Date.now() - SCORING_WINDOW_MS;

    const logs = await ctx.db
      .query("autopilotActivityLog")
      .withIndex("by_org_created", (q) =>
        q.eq("organizationId", args.organizationId).gte("createdAt", cutoff)
      )
      .collect();

    const roleLogs = logs.filter((l) => l.role === args.role);
    const totalActions = roleLogs.filter((l) => l.action === "action").length;
    const successCount = roleLogs.filter((l) => l.level === "success").length;
    const errorCount = roleLogs.filter((l) => l.level === "error").length;

    const documentsCreated = roleLogs.filter(
      (l) => l.entityType === "document" && l.action === "action"
    ).length;

    // Count approved documents (published status via review)
    const docs = await ctx.db
      .query("autopilotDocuments")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .order("desc")
      .take(200);

    const roleDocs = docs.filter(
      (d) => d.sourceRole === args.role && d.createdAt > cutoff
    );
    const approvedDocs = roleDocs.filter(
      (d) => d.status === "published"
    ).length;

    const totalWithOutput = Math.max(totalActions, 1);

    return {
      role: args.role,
      totalActions,
      successCount,
      errorCount,
      successRate: successCount / totalWithOutput,
      documentsCreated,
      documentsApproved: approvedDocs,
      approvalRate: roleDocs.length > 0 ? approvedDocs / roleDocs.length : 0,
    };
  },
});

export const getAllRoleScores = internalQuery({
  args: {
    organizationId: v.id("organizations"),
  },
  returns: v.array(
    v.object({
      role: v.string(),
      totalActions: v.number(),
      successRate: v.number(),
      documentsCreated: v.number(),
      approvalRate: v.number(),
    })
  ),
  handler: async (ctx, args) => {
    const cutoff = Date.now() - SCORING_WINDOW_MS;

    const logs = await ctx.db
      .query("autopilotActivityLog")
      .withIndex("by_org_created", (q) =>
        q.eq("organizationId", args.organizationId).gte("createdAt", cutoff)
      )
      .collect();

    const docs = await ctx.db
      .query("autopilotDocuments")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .order("desc")
      .take(500);

    const roles = ["pm", "cto", "growth", "support", "sales"] as const;

    return roles.map((role) => {
      const roleLogs = logs.filter((l) => l.role === role);
      const totalActions = roleLogs.filter((l) => l.action === "action").length;
      const successCount = roleLogs.filter((l) => l.level === "success").length;

      const roleDocs = docs.filter(
        (d) => d.sourceRole === role && d.createdAt > cutoff
      );
      const approvedDocs = roleDocs.filter(
        (d) => d.status === "published"
      ).length;

      const totalWithOutput = Math.max(totalActions, 1);

      return {
        role,
        totalActions,
        successRate: successCount / totalWithOutput,
        documentsCreated: roleDocs.length,
        approvalRate: roleDocs.length > 0 ? approvedDocs / roleDocs.length : 0,
      };
    });
  },
});
