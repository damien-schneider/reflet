/**
 * Agent Scoring — derives per-agent performance metrics from activity logs.
 *
 * Metrics: output rate, success/failure ratio, cost efficiency,
 * review approval rate. Used by heartbeat for smart prioritization.
 */

import { v } from "convex/values";
import { internalQuery } from "../_generated/server";
import { assignedAgent } from "./schema/validators";

const SCORING_WINDOW_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export const getAgentScore = internalQuery({
  args: {
    organizationId: v.id("organizations"),
    agent: assignedAgent,
  },
  returns: v.object({
    agent: v.string(),
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

    const agentLogs = logs.filter((l) => l.agent === args.agent);
    const totalActions = agentLogs.filter((l) => l.action === "action").length;
    const successCount = agentLogs.filter((l) => l.level === "success").length;
    const errorCount = agentLogs.filter((l) => l.level === "error").length;

    const documentsCreated = agentLogs.filter(
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

    const agentDocs = docs.filter(
      (d) => d.sourceAgent === args.agent && d.createdAt > cutoff
    );
    const approvedDocs = agentDocs.filter(
      (d) => d.status === "published"
    ).length;

    const totalWithOutput = Math.max(totalActions, 1);

    return {
      agent: args.agent,
      totalActions,
      successCount,
      errorCount,
      successRate: successCount / totalWithOutput,
      documentsCreated,
      documentsApproved: approvedDocs,
      approvalRate: agentDocs.length > 0 ? approvedDocs / agentDocs.length : 0,
    };
  },
});

export const getAllAgentScores = internalQuery({
  args: {
    organizationId: v.id("organizations"),
  },
  returns: v.array(
    v.object({
      agent: v.string(),
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

    const agents = ["pm", "cto", "dev", "growth", "support", "sales"] as const;

    return agents.map((agent) => {
      const agentLogs = logs.filter((l) => l.agent === agent);
      const totalActions = agentLogs.filter(
        (l) => l.action === "action"
      ).length;
      const successCount = agentLogs.filter(
        (l) => l.level === "success"
      ).length;

      const agentDocs = docs.filter(
        (d) => d.sourceAgent === agent && d.createdAt > cutoff
      );
      const approvedDocs = agentDocs.filter(
        (d) => d.status === "published"
      ).length;

      const totalWithOutput = Math.max(totalActions, 1);

      return {
        agent,
        totalActions,
        successRate: successCount / totalWithOutput,
        documentsCreated: agentDocs.length,
        approvalRate:
          agentDocs.length > 0 ? approvedDocs / agentDocs.length : 0,
      };
    });
  },
});
