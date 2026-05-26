/**
 * CEO coordination loop — assesses role-skill health, detects conflicts,
 * applies priority overrides, relays directives, and raises proactive alerts.
 * Includes bottleneck and starvation detection.
 */

import { v } from "convex/values";
import { z } from "zod";
import { internal } from "../../../_generated/api";
import type { Doc, Id } from "../../../_generated/dataModel";
import {
  type ActionCtx,
  internalAction,
  internalQuery,
} from "../../../_generated/server";
import {
  type computeChainState,
  getRoleMissingDependencies,
  ROLE_CHAIN_REQUIREMENTS,
} from "../../chain";
import { generateObjectWithFallback } from "../shared_generation";
import { formatTaskStats } from "./reports";
import { CEO_MODELS } from "./runtime";

// ============================================
// SCHEMA
// ============================================

const coordinationSchema = z.object({
  roleAssessments: z.array(
    z.object({
      role: z.string().describe("Role skill name (pm, cto, growth, etc.)"),
      status: z
        .enum(["healthy", "idle", "blocked", "needs_attention"])
        .describe("Role-skill operational status"),
      recommendation: z.string().describe("Action to take for this role skill"),
    })
  ),
  crossRoleConflicts: z.array(
    z.object({
      roles: z.array(z.string()).describe("Conflicting role skills"),
      description: z.string().describe("Nature of the conflict"),
      resolution: z.string().describe("Suggested resolution"),
    })
  ),
  priorityOverrides: z.array(
    z.object({
      taskId: z
        .string()
        .describe("Exact task ID from the provided candidate list"),
      newPriority: z
        .enum(["critical", "high", "medium", "low"])
        .describe("New priority"),
      reason: z.string().describe("Why reprioritize"),
    })
  ),
  proactiveAlerts: z.array(
    z.object({
      title: z.string().describe("Alert title"),
      severity: z
        .enum(["info", "warning", "critical"])
        .describe("Alert severity"),
      description: z.string().describe("Alert details"),
    })
  ),
});

type CoordinationOutput = z.infer<typeof coordinationSchema>;
type CoordinationTask = Doc<"autopilotWorkItems">;

// ============================================
// HELPERS
// ============================================

function countTasksByRole(tasks: CoordinationTask[]): Record<string, number> {
  const taskCountsByRole: Record<string, number> = {};
  for (const task of tasks) {
    if (task.assignedRole) {
      taskCountsByRole[task.assignedRole] =
        (taskCountsByRole[task.assignedRole] ?? 0) + 1;
    }
  }
  return taskCountsByRole;
}

function buildPriorityOverrideCandidates(tasks: CoordinationTask[]) {
  const taskById = new Map<string, CoordinationTask>();
  for (const task of tasks) {
    taskById.set(task._id, task);
  }
  const summary = tasks
    .map(
      (task) =>
        `${task._id} | ${task.status} | ${task.priority} | ${task.assignedRole} | ${task.title}`
    )
    .join("\n");
  return { summary, taskById };
}

async function applyPriorityOverrides(
  ctx: ActionCtx,
  organizationId: Id<"organizations">,
  overrides: CoordinationOutput["priorityOverrides"],
  taskById: Map<string, CoordinationTask>
) {
  for (const override of overrides) {
    const task = taskById.get(override.taskId);
    if (!task) {
      await ctx.runMutation(internal.autopilot.task_mutations.logActivity, {
        organizationId,
        role: "system",
        level: "info",
        message: `CEO skipped invalid priority override task ID: ${override.taskId}`,
      });
      continue;
    }

    // Idempotency: if the task already sits at the requested priority, this
    // override is a no-op. Skipping the mutation also skips the activity log,
    // preventing the "reprioritized to critical" feedback loop where the LLM
    // keeps re-suggesting the same priority every coordination tick.
    if (task.priority === override.newPriority) {
      continue;
    }

    try {
      await ctx.runMutation(
        internal.autopilot.task_mutations.updateTaskPriority,
        {
          taskId: task._id,
          priority: override.newPriority,
        }
      );
      await ctx.runMutation(internal.autopilot.task_mutations.logActivity, {
        organizationId,
        role: "system",
        level: "action",
        message: `CEO reprioritized task to ${override.newPriority}: ${override.reason}`,
      });
    } catch {
      // Task may no longer exist — skip.
    }
  }
}

async function createCoordinationAlerts(
  ctx: ActionCtx,
  organizationId: Id<"organizations">,
  alerts: CoordinationOutput["proactiveAlerts"]
) {
  for (const alert of alerts) {
    if (alert.severity === "info") {
      continue;
    }
    await ctx.runMutation(internal.autopilot.task_mutations.logActivity, {
      organizationId,
      role: "system",
      level: alert.severity === "critical" ? "warning" : "info",
      message: `CEO Alert: ${alert.title}`,
      details: alert.description,
    });
  }
}

// ============================================
// STARVATION & BOTTLENECK DETECTION
// ============================================

const COORDINATION_NOTE_DEDUP_WINDOW_MS = 6 * 60 * 60 * 1000;

/**
 * Identifies role skills gated upstream by missing chain nodes. Chain-gated
 * skills are expected to be idle until their dependencies publish — they should
 * NOT be flagged as starved, otherwise the heartbeat creates a fresh "starvation
 * detected" note every tick during bootstrap.
 */
export function getChainGatedRoles(
  chainState: Awaited<ReturnType<typeof computeChainState>>,
  enabledRoles: string[]
): Set<string> {
  const gated = new Set<string>();
  for (const role of enabledRoles) {
    if (!ROLE_CHAIN_REQUIREMENTS[role]) {
      continue;
    }
    if (getRoleMissingDependencies(chainState, role).length > 0) {
      gated.add(role);
    }
  }
  return gated;
}

export function detectStarvedRoles(
  activityByRole: Record<string, number>,
  enabledRoles: string[],
  chainGatedRoles: Set<string>
): string[] {
  return enabledRoles.filter(
    (role) => !chainGatedRoles.has(role) && (activityByRole[role] ?? 0) === 0
  );
}

function detectBottlenecks(
  pendingByRole: Record<string, number>,
  inProgressByRole: Record<string, number>
): Array<{ role: string; pending: number; inProgress: number }> {
  const bottlenecks: Array<{
    role: string;
    pending: number;
    inProgress: number;
  }> = [];
  const BOTTLENECK_THRESHOLD = 5;

  for (const [role, pending] of Object.entries(pendingByRole)) {
    const inProgress = inProgressByRole[role] ?? 0;
    if (pending >= BOTTLENECK_THRESHOLD && inProgress === 0) {
      bottlenecks.push({ role, pending, inProgress });
    }
  }
  return bottlenecks;
}

const STARVATION_TITLE_RE = /Starvation detected: (.+)/;
const BOTTLENECK_TITLE_RE = /Bottleneck: (\S+) /;

/**
 * Returns the set of role skills that already have a recent coordination note
 * matching `tag` within the dedup window. The CEO uses this to skip creating
 * duplicate notes, which is the root cause of the observed feedback loop
 * (9+ identical starvation alerts within 2h on the same chain bootstrap).
 */
export const getRecentCoordinationFlags = internalQuery({
  args: {
    organizationId: v.id("organizations"),
  },
  returns: v.object({
    recentStarvationRoles: v.array(v.string()),
    recentBottleneckRoles: v.array(v.string()),
  }),
  handler: async (ctx, args) => {
    const since = Date.now() - COORDINATION_NOTE_DEDUP_WINDOW_MS;
    const recentNotes = await ctx.db
      .query("autopilotDocuments")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", args.organizationId).eq("type", "note")
      )
      .order("desc")
      .take(100);

    const starvation = new Set<string>();
    const bottleneck = new Set<string>();
    for (const note of recentNotes) {
      if (note.createdAt < since) {
        continue;
      }
      const tags = note.tags ?? [];
      if (tags.includes("starvation")) {
        const match = STARVATION_TITLE_RE.exec(note.title);
        if (match) {
          for (const role of match[1].split(",").map((value) => value.trim())) {
            starvation.add(role);
          }
        }
      }
      if (tags.includes("bottleneck")) {
        const match = BOTTLENECK_TITLE_RE.exec(note.title);
        if (match) {
          bottleneck.add(match[1]);
        }
      }
    }

    return {
      recentStarvationRoles: Array.from(starvation),
      recentBottleneckRoles: Array.from(bottleneck),
    };
  },
});

// ============================================
// COORDINATION ACTION
// ============================================

/**
 * Run the CEO coordination loop.
 * Checks all role-skill statuses, detects conflicts, identifies idle role skills,
 * and generates proactive alerts. Runs every 30 minutes.
 */
export const runCEOCoordination = internalAction({
  args: { organizationId: v.id("organizations") },
  returns: v.null(),
  handler: async (ctx, args) => {
    try {
      // Guard check: ensure budget/rate limits allow execution
      const guardResult = await ctx.runQuery(
        internal.autopilot.guards.checkGuards,
        { organizationId: args.organizationId, role: "system" }
      );
      if (!guardResult.allowed) {
        return null;
      }

      const ceoContext = await ctx.runQuery(
        internal.autopilot.role_skills.ceo.queries.getCEOContext,
        { organizationId: args.organizationId }
      );

      const roleSkillContext = await ctx.runQuery(
        internal.autopilot.role_context.loadRoleSkillContext,
        { organizationId: args.organizationId, role: "system" }
      );

      const pendingTasks = await ctx.runQuery(
        internal.autopilot.task_queries.getTasksByOrg,
        { organizationId: args.organizationId, status: "todo" }
      );
      const inProgressTasks = await ctx.runQuery(
        internal.autopilot.task_queries.getTasksByOrg,
        { organizationId: args.organizationId, status: "in_progress" }
      );

      const roleActivity = Object.entries(ceoContext.activityByRole)
        .map(([role, count]) => `${role}: ${count} actions in last 7d`)
        .join("\n");

      const pendingByRole = countTasksByRole(pendingTasks);
      const inProgressByRole = countTasksByRole(inProgressTasks);
      const allCandidateTasks = [...pendingTasks, ...inProgressTasks];
      const priorityOverrideCandidates =
        buildPriorityOverrideCandidates(allCandidateTasks);

      const systemPrompt = `You are the CEO coordination skill analyzing one visible chain runtime.

Your job is to:
1. Assess each active role skill's operational status
2. Detect conflicts between role-skill outputs (duplicate work, contradictions)
3. Identify idle role skills that should be doing work
4. Generate proactive alerts for emerging issues
5. Suggest priority overrides when needed

Be specific and actionable. Only flag real issues, not hypotheticals.${roleSkillContext}`;

      const prompt = `Analyze the current state of all role skills and generate coordination directives.

ROLE-SKILL ACTIVITY (last 7 days):
${roleActivity || "No recent activity"}

PENDING TASKS BY ROLE SKILL:
${
  Object.entries(pendingByRole)
    .map(([role, count]) => `${role}: ${count} pending`)
    .join("\n") || "None"
}

IN-PROGRESS TASKS BY ROLE SKILL:
${
  Object.entries(inProgressByRole)
    .map(([role, count]) => `${role}: ${count} in progress`)
    .join("\n") || "None"
}

TASK STATS:
${formatTaskStats(ceoContext.taskStats)}

PENDING REVIEW ITEMS: ${ceoContext.pendingReviewCount}

VALID TASK IDS FOR PRIORITY OVERRIDES:
${priorityOverrideCandidates.summary || "None"}

Only return priority overrides for task IDs from the candidate list above. If no candidate needs a change, return an empty array.

Assess each role skill, identify conflicts, suggest priority changes, and raise alerts.`;

      const coordination = await generateObjectWithFallback({
        models: CEO_MODELS,
        schema: coordinationSchema,
        systemPrompt,
        prompt,
        temperature: 0,
      });

      await applyPriorityOverrides(
        ctx,
        args.organizationId,
        coordination.priorityOverrides,
        priorityOverrideCandidates.taskById
      );

      await createCoordinationAlerts(
        ctx,
        args.organizationId,
        coordination.proactiveAlerts
      );

      const enabledRoles = await ctx.runQuery(
        internal.autopilot.config.getEnabledRoleSkills,
        { organizationId: args.organizationId }
      );

      // Dedup + chain-gate: role skills blocked by missing upstream chain
      // nodes are expected to be idle and must not be reported as starved. We
      // also skip a fresh note if a matching one was logged in the last 6h —
      // this prevents the observed feedback loop where the LLM reads its own
      // past alerts and amplifies them at every 30-min coordination tick.
      const chainState = await ctx.runQuery(
        internal.autopilot.chain.getChainState,
        { organizationId: args.organizationId }
      );
      const coordinationFlags = await ctx.runQuery(
        internal.autopilot.role_skills.ceo.coordination
          .getRecentCoordinationFlags,
        { organizationId: args.organizationId }
      );
      const chainGatedRoles = getChainGatedRoles(chainState, enabledRoles);
      const recentStarvation = new Set(coordinationFlags.recentStarvationRoles);
      const recentBottleneck = new Set(coordinationFlags.recentBottleneckRoles);

      const starvedRoles = detectStarvedRoles(
        ceoContext.activityByRole,
        enabledRoles,
        chainGatedRoles
      ).filter((role) => !recentStarvation.has(role));
      if (starvedRoles.length > 0) {
        await ctx.runMutation(internal.autopilot.documents.createDocument, {
          organizationId: args.organizationId,
          type: "note",
          title: `Starvation detected: ${starvedRoles.join(", ")}`,
          content: `These role skills have 0 activity in the last 7 days: ${starvedRoles.join(", ")}. They may need work assigned or may be stuck.`,
          sourceRole: "system",
          needsReview: false,
          reviewType: "coordination_alert",
          tags: ["coordination", "starvation"],
        });
      }

      // Detect bottlenecks (many pending, 0 in-progress)
      const bottlenecks = detectBottlenecks(pendingByRole, inProgressByRole);
      for (const bottleneck of bottlenecks) {
        if (recentBottleneck.has(bottleneck.role)) {
          continue;
        }
        await ctx.runMutation(internal.autopilot.documents.createDocument, {
          organizationId: args.organizationId,
          type: "note",
          title: `Bottleneck: ${bottleneck.role} has ${bottleneck.pending} pending tasks, 0 in progress`,
          content: `Role skill "${bottleneck.role}" has ${bottleneck.pending} tasks waiting but none being worked on. This role skill may be blocked or needs attention.`,
          sourceRole: "system",
          needsReview: false,
          reviewType: "coordination_alert",
          tags: ["coordination", "bottleneck"],
        });
      }

      const blockedRoles = coordination.roleAssessments.filter(
        (assessment) =>
          assessment.status === "blocked" ||
          assessment.status === "needs_attention"
      );

      await ctx.runMutation(internal.autopilot.task_mutations.logActivity, {
        organizationId: args.organizationId,
        role: "system",
        level: blockedRoles.length > 0 ? "warning" : "success",
        message: `CEO coordination: ${coordination.roleAssessments.length} role skills assessed, ${coordination.crossRoleConflicts.length} conflicts, ${coordination.proactiveAlerts.length} alerts`,
        details: JSON.stringify({
          blockedRoles: blockedRoles.map((assessment) => assessment.role),
          conflicts: coordination.crossRoleConflicts.length,
          priorityOverrides: coordination.priorityOverrides.length,
        }),
      });

      return null;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";

      await ctx.runMutation(internal.autopilot.task_mutations.logActivity, {
        organizationId: args.organizationId,
        role: "system",
        level: "error",
        message: `CEO coordination failed: ${errorMessage}`,
      });

      return null;
    }
  },
});
