/**
 * Ops Agent — monitors deployments, detects error spikes,
 * captures reliability snapshots, and generates weekly reports.
 *
 * Flow:
 *   1. Hourly: check recent deployments for failures
 *   2. Post-deploy: compare error rates vs pre-deploy baseline
 *   3. Daily: capture ops snapshot (deploy count, uptime, incidents)
 *   4. Weekly: generate reliability report with trends
 */

import { v } from "convex/values";
import { z } from "zod";
import { internal } from "../../_generated/api";
import {
  internalAction,
  internalMutation,
  internalQuery,
} from "../../_generated/server";
import { MODELS } from "./models";
import { generateObjectWithFallback } from "./shared";

const severityToPriority = (
  severity: string
): "critical" | "high" | "medium" => {
  if (severity === "critical") {
    return "critical";
  }
  if (severity === "high") {
    return "high";
  }
  return "medium";
};

const OPS_MODELS = [MODELS.FREE, MODELS.FAST] as const;

// ============================================
// ZOD SCHEMAS
// ============================================

export const deploymentAnalysisSchema = z.object({
  issues: z.array(
    z.object({
      type: z.enum([
        "deploy_failure",
        "error_spike",
        "performance_regression",
        "rollback_needed",
      ]),
      severity: z.enum(["low", "medium", "high", "critical"]),
      description: z.string(),
      suggestedAction: z.string(),
    })
  ),
  overallStatus: z.enum(["healthy", "warning", "critical"]),
  summary: z.string(),
});

export const reliabilityReportSchema = z.object({
  summary: z.string(),
  uptimePercent: z.number(),
  highlights: z.array(
    z.object({
      metric: z.string(),
      value: z.string(),
      trend: z.enum(["improving", "declining", "stable"]),
    })
  ),
  incidents: z.array(
    z.object({
      date: z.string(),
      description: z.string(),
      resolved: z.boolean(),
      duration: z
        .string()
        .describe("Duration of the incident, empty string if unknown"),
    })
  ),
  recommendations: z.array(z.string()),
});

// ============================================
// DEPLOYMENT MONITORING (hourly cron)
// ============================================

export const monitorDeployments = internalAction({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    // Check prerequisites — skip LLM call if no real data
    const prereq = await ctx.runQuery(
      internal.autopilot.prerequisites.checkOpsPrerequisites,
      { organizationId: args.organizationId }
    );

    if (!prereq.ready) {
      const recentSkipLog = await ctx.runQuery(
        internal.autopilot.prerequisites.wasSkipLoggedRecently,
        { organizationId: args.organizationId, agent: "ops", windowHours: 24 }
      );
      if (!recentSkipLog) {
        await ctx.runMutation(
          internal.autopilot.prerequisites.logPrerequisiteSkip,
          {
            organizationId: args.organizationId,
            agent: "ops",
            reason: prereq.reason ?? "Prerequisites not met",
          }
        );
      }
      return;
    }

    await ctx.runMutation(internal.autopilot.tasks.logActivity, {
      organizationId: args.organizationId,
      agent: "ops",
      level: "action",
      message: "Checking recent deployments",
    });

    // Get ops snapshot data for context
    const recentSnapshots = await ctx.runQuery(
      internal.autopilot.agents.ops.getRecentOpsSnapshots,
      { organizationId: args.organizationId, limit: 3 }
    );

    // Filter out all-zero snapshots — they cause the LLM to hallucinate issues
    const meaningfulSnapshots = recentSnapshots.filter(
      (s: { deployCount: number; failedDeploys: number; errorRate?: number }) =>
        s.deployCount > 0 || s.failedDeploys > 0 || (s.errorRate ?? 0) > 0
    );

    if (meaningfulSnapshots.length === 0) {
      await ctx.runMutation(internal.autopilot.tasks.logActivity, {
        organizationId: args.organizationId,
        agent: "ops",
        level: "info",
        message:
          "Deployment check skipped — all recent snapshots contain zero data",
      });
      return;
    }

    const snapshotContext = meaningfulSnapshots
      .map(
        (s: {
          snapshotDate: string;
          deployCount: number;
          failedDeploys: number;
          errorRate?: number;
        }) =>
          `${s.snapshotDate}: ${s.deployCount} deploys, ${s.failedDeploys} failed, ${s.errorRate ?? 0}% errors`
      )
      .join("\n");

    const analysis = await generateObjectWithFallback({
      models: OPS_MODELS,
      schema: deploymentAnalysisSchema,
      systemPrompt:
        "You are a DevOps monitoring agent. Analyze deployment health and flag issues requiring attention. Only report issues you can confirm from the data — do NOT report issues when data is insufficient.",
      prompt: `Analyze deployment health:

Recent ops snapshots:
${snapshotContext}

Check for: failed deploys, error spikes, performance regressions, rollback candidates.
If the data is insufficient to draw conclusions, return an empty issues array with overallStatus "healthy".`,
    });

    for (const issue of analysis.issues) {
      const typeMap = {
        deploy_failure: "ops_deploy_failure",
        error_spike: "ops_error_spike",
        performance_regression: "ops_error_spike",
        rollback_needed: "ops_rollback",
      } as const;

      await ctx.runMutation(internal.autopilot.inbox.createInboxItem, {
        organizationId: args.organizationId,
        type: typeMap[issue.type],
        title: `Ops: ${issue.description.slice(0, 80)}`,
        summary: `${issue.description}\n\nSuggested action: ${issue.suggestedAction}`,
        sourceAgent: "ops",
        priority: severityToPriority(issue.severity),
        metadata: JSON.stringify(issue),
      });

      // Create task for critical/high issues
      if (issue.severity === "critical" || issue.severity === "high") {
        await ctx.runMutation(internal.autopilot.tasks.createTask, {
          organizationId: args.organizationId,
          title: `[Ops] ${issue.type}: ${issue.description.slice(0, 80)}`,
          description: `${issue.description}\n\nSuggested action: ${issue.suggestedAction}`,
          priority: issue.severity === "critical" ? "critical" : "high",
          assignedAgent: "dev",
          origin: "ops_incident",
          autonomyLevel: "review_required",
        });
      }
    }

    await ctx.runMutation(internal.autopilot.tasks.logActivity, {
      organizationId: args.organizationId,
      agent: "ops",
      level: analysis.overallStatus === "critical" ? "warning" : "success",
      message: `Deployment check: ${analysis.overallStatus} — ${analysis.summary}`,
    });
  },
});

// ============================================
// DAILY OPS SNAPSHOT
// ============================================

export const captureOpsSnapshot = internalAction({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    const today = new Date().toISOString().split("T")[0];

    await ctx.runMutation(internal.autopilot.tasks.logActivity, {
      organizationId: args.organizationId,
      agent: "ops",
      level: "action",
      message: `Capturing ops snapshot for ${today}`,
    });

    // In production, this would be populated from Vercel MCP + PostHog.
    // Skip storing zero-data snapshots — they pollute the LLM context and
    // cause hallucinated alerts when monitorDeployments sees non-empty snapshot list.
    const deployCount = 0;
    const failedDeploys = 0;
    const incidentCount = 0;

    if (deployCount === 0 && failedDeploys === 0 && incidentCount === 0) {
      await ctx.runMutation(internal.autopilot.tasks.logActivity, {
        organizationId: args.organizationId,
        agent: "ops",
        level: "info",
        message: `Ops snapshot skipped for ${today} — no deployment data available`,
      });
      return;
    }

    await ctx.runMutation(internal.autopilot.agents.ops.storeOpsSnapshot, {
      organizationId: args.organizationId,
      snapshotDate: today,
      deployCount,
      failedDeploys,
      incidentCount,
      createdAt: Date.now(),
    });

    await ctx.runMutation(internal.autopilot.tasks.logActivity, {
      organizationId: args.organizationId,
      agent: "ops",
      level: "success",
      message: `Ops snapshot captured for ${today}`,
    });
  },
});

// ============================================
// WEEKLY RELIABILITY REPORT
// ============================================

export const generateReliabilityReport = internalAction({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    await ctx.runMutation(internal.autopilot.tasks.logActivity, {
      organizationId: args.organizationId,
      agent: "ops",
      level: "action",
      message: "Generating weekly reliability report",
    });

    const snapshots = await ctx.runQuery(
      internal.autopilot.agents.ops.getRecentOpsSnapshots,
      { organizationId: args.organizationId, limit: 30 }
    );

    if (snapshots.length === 0) {
      await ctx.runMutation(internal.autopilot.tasks.logActivity, {
        organizationId: args.organizationId,
        agent: "ops",
        level: "info",
        message: "No ops data available for reliability report",
      });
      return;
    }

    // Filter out all-zero snapshots — no value in sending empty data to LLM
    const meaningful = snapshots.filter(
      (s: {
        deployCount: number;
        failedDeploys: number;
        incidentCount: number;
      }) => s.deployCount > 0 || s.failedDeploys > 0 || s.incidentCount > 0
    );

    if (meaningful.length === 0) {
      await ctx.runMutation(internal.autopilot.tasks.logActivity, {
        organizationId: args.organizationId,
        agent: "ops",
        level: "info",
        message:
          "Reliability report skipped — no meaningful deployment data in snapshots",
      });
      return;
    }

    const snapshotData = snapshots
      .map(
        (s: {
          snapshotDate: string;
          deployCount: number;
          failedDeploys: number;
          uptimePercent?: number;
          incidentCount: number;
        }) =>
          `${s.snapshotDate}: ${s.deployCount} deploys, ${s.failedDeploys} failed, ${s.uptimePercent ?? 100}% uptime, ${s.incidentCount} incidents`
      )
      .join("\n");

    const report = await generateObjectWithFallback({
      models: OPS_MODELS,
      schema: reliabilityReportSchema,
      systemPrompt:
        "You are a reliability engineer generating a weekly ops report. Summarize deployment health, uptime trends, and incident patterns.",
      prompt: `Generate a weekly reliability report from this data:\n\n${snapshotData}`,
    });

    await ctx.runMutation(internal.autopilot.inbox.createInboxItem, {
      organizationId: args.organizationId,
      type: "ops_reliability_report",
      title: "Weekly Reliability Report",
      summary: report.summary,
      content: JSON.stringify(report),
      sourceAgent: "ops",
      priority: "medium",
      autoApproved: true,
    });

    await ctx.runMutation(internal.autopilot.tasks.logActivity, {
      organizationId: args.organizationId,
      agent: "ops",
      level: "success",
      message: `Reliability report generated — uptime: ${report.uptimePercent}%, ${report.incidents.length} incidents`,
    });
  },
});

// ============================================
// INTERNAL QUERIES & MUTATIONS
// ============================================

export const getRecentOpsSnapshots = internalQuery({
  args: {
    organizationId: v.id("organizations"),
    limit: v.number(),
  },
  returns: v.array(
    v.object({
      _id: v.id("autopilotOpsSnapshots"),
      _creationTime: v.number(),
      organizationId: v.id("organizations"),
      snapshotDate: v.string(),
      deployCount: v.number(),
      failedDeploys: v.number(),
      avgBuildTime: v.optional(v.number()),
      errorRate: v.optional(v.number()),
      uptimePercent: v.optional(v.number()),
      incidentCount: v.number(),
      createdAt: v.number(),
    })
  ),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("autopilotOpsSnapshots")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .order("desc")
      .take(args.limit);
  },
});

export const storeOpsSnapshot = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    snapshotDate: v.string(),
    deployCount: v.number(),
    failedDeploys: v.number(),
    avgBuildTime: v.optional(v.number()),
    errorRate: v.optional(v.number()),
    uptimePercent: v.optional(v.number()),
    incidentCount: v.number(),
    createdAt: v.number(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("autopilotOpsSnapshots")
      .withIndex("by_org_date", (q) =>
        q
          .eq("organizationId", args.organizationId)
          .eq("snapshotDate", args.snapshotDate)
      )
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        deployCount: args.deployCount,
        failedDeploys: args.failedDeploys,
        avgBuildTime: args.avgBuildTime,
        errorRate: args.errorRate,
        uptimePercent: args.uptimePercent,
        incidentCount: args.incidentCount,
      });
      return existing._id;
    }

    return await ctx.db.insert("autopilotOpsSnapshots", args);
  },
});
