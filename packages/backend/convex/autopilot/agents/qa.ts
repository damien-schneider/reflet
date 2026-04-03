/**
 * QA Agent — generates end-to-end tests from task specs and
 * detects regressions after PR merges.
 *
 * Flow:
 *   1. Read task acceptance criteria + CTO technical spec
 *   2. Generate Playwright E2E test code via AI
 *   3. Create PR with test files via coding adapter
 *   4. After PR merge: check CI status, correlate with error data
 *   5. If regression detected: create high-priority bug task
 */

import { v } from "convex/values";
import { z } from "zod";
import { internal } from "../../_generated/api";
import type { Id } from "../../_generated/dataModel";
import {
  type ActionCtx,
  internalAction,
  internalQuery,
} from "../../_generated/server";
import { MODELS } from "./models";
import { generateObjectWithFallback } from "./shared";

const QA_MODELS = [MODELS.FAST, MODELS.SMART] as const;

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

// ============================================
// ZOD SCHEMAS
// ============================================

export const testGenerationSchema = z.object({
  tests: z.array(
    z.object({
      filename: z.string(),
      description: z.string(),
      testCode: z.string(),
      coversCriteria: z.array(z.string()),
    })
  ),
  summary: z.string(),
});

export const regressionCheckSchema = z.object({
  hasRegression: z.boolean(),
  findings: z.array(
    z.object({
      type: z.enum(["error_spike", "test_failure", "performance_degradation"]),
      severity: z.enum(["low", "medium", "high", "critical"]),
      description: z.string(),
      affectedArea: z.string(),
      reproductionSteps: z.array(z.string()).default([]),
    })
  ),
  summary: z.string(),
});

// ============================================
// TEST GENERATION
// ============================================

export const generateE2ETests = internalAction({
  args: {
    organizationId: v.id("organizations"),
    taskId: v.id("autopilotTasks"),
  },
  handler: async (ctx, args) => {
    await ctx.runMutation(internal.autopilot.tasks.logActivity, {
      organizationId: args.organizationId,
      taskId: args.taskId,
      agent: "qa",
      level: "action",
      message: "Generating E2E tests for task",
    });

    const task = await ctx.runQuery(internal.autopilot.tasks.getTask, {
      taskId: args.taskId,
    });

    if (!task) {
      throw new Error(`Task not found: ${args.taskId}`);
    }

    const criteria =
      task.acceptanceCriteria?.join("\n- ") ?? "No criteria specified";
    const spec = task.technicalSpec ?? "No technical spec available";

    const result = await generateObjectWithFallback({
      models: QA_MODELS,
      schema: testGenerationSchema,
      systemPrompt: `You are a QA engineer who writes Playwright E2E tests.
Generate tests that cover the acceptance criteria for the given task.
Write TypeScript Playwright test files following best practices:
- Use page object patterns where appropriate
- Test the happy path and key edge cases
- Use descriptive test names
- Include proper assertions`,
      prompt: `Generate E2E tests for this task:

Title: ${task.title}
Description: ${task.description}

Acceptance Criteria:
- ${criteria}

Technical Spec:
${spec}`,
    });

    // Create inbox item with the generated tests
    await ctx.runMutation(internal.autopilot.inbox.createInboxItem, {
      organizationId: args.organizationId,
      type: "qa_test_ready",
      title: `E2E tests ready: ${task.title}`,
      summary: result.summary,
      content: JSON.stringify(result.tests),
      sourceAgent: "qa",
      priority: "medium",
      relatedTaskId: args.taskId,
      metadata: JSON.stringify({
        testCount: result.tests.length,
        files: result.tests.map((t) => t.filename),
      }),
    });

    await ctx.runMutation(internal.autopilot.tasks.logActivity, {
      organizationId: args.organizationId,
      taskId: args.taskId,
      agent: "qa",
      level: "success",
      message: `Generated ${result.tests.length} E2E test files — ${result.summary}`,
    });
  },
});

// ============================================
// REGRESSION CHECK (triggered by PR merge)
// ============================================

async function processRegressionFinding(
  ctx: ActionCtx,
  organizationId: Id<"organizations">,
  taskId: Id<"autopilotTasks"> | undefined,
  finding: {
    severity: string;
    affectedArea: string;
    description: string;
    reproductionSteps: string[];
  }
) {
  await ctx.runMutation(internal.autopilot.inbox.createInboxItem, {
    organizationId,
    type: "qa_regression",
    title: `Regression: ${finding.affectedArea}`,
    summary: finding.description,
    sourceAgent: "qa",
    priority: severityToPriority(finding.severity),
    relatedTaskId: taskId,
    metadata: JSON.stringify(finding),
  });

  const isCriticalOrHigh =
    finding.severity === "critical" || finding.severity === "high";
  if (!isCriticalOrHigh) {
    return;
  }

  await ctx.runMutation(internal.autopilot.tasks.createTask, {
    organizationId,
    title: `[Regression] ${finding.affectedArea}: ${finding.description.slice(0, 100)}`,
    description: [
      finding.description,
      "",
      "Reproduction steps:",
      ...(finding.reproductionSteps.length > 0
        ? finding.reproductionSteps.map((s) => `- ${s}`)
        : ["- No reproduction steps available"]),
    ].join("\n"),
    priority: finding.severity === "critical" ? "critical" : "high",
    assignedAgent: "dev",
    origin: "qa_regression",
    autonomyLevel: "review_required",
  });
}

export const runRegressionCheck = internalAction({
  args: {
    organizationId: v.id("organizations"),
    taskId: v.optional(v.id("autopilotTasks")),
    prNumber: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await ctx.runMutation(internal.autopilot.tasks.logActivity, {
      organizationId: args.organizationId,
      taskId: args.taskId,
      agent: "qa",
      level: "action",
      message: `Running regression check${args.prNumber ? ` for PR #${args.prNumber}` : ""}`,
    });

    const recentTasks = await ctx.runQuery(
      internal.autopilot.agents.qa.getRecentMergedTasks,
      { organizationId: args.organizationId }
    );

    const taskContext = recentTasks
      .map(
        (t: { title: string; prUrl?: string }) =>
          `- ${t.title} (PR: ${t.prUrl ?? "N/A"})`
      )
      .join("\n");

    const result = await generateObjectWithFallback({
      models: QA_MODELS,
      schema: regressionCheckSchema,
      systemPrompt:
        "You are a QA agent checking for regressions after a deployment. Analyze the deployment context and flag any potential issues.",
      prompt: `Check for regressions after recent merges:

Recently merged tasks:
${taskContext || "No recent merges"}

${args.prNumber ? `Focus on PR #${args.prNumber}` : "Check all recent changes"}

Analyze for: test failures, error spikes, performance degradation.`,
    });

    if (result.hasRegression) {
      for (const finding of result.findings) {
        await processRegressionFinding(
          ctx,
          args.organizationId,
          args.taskId,
          finding
        );
      }
    }

    await ctx.runMutation(internal.autopilot.tasks.logActivity, {
      organizationId: args.organizationId,
      taskId: args.taskId,
      agent: "qa",
      level: result.hasRegression ? "warning" : "success",
      message: result.hasRegression
        ? `Regression detected: ${result.findings.length} issues found — ${result.summary}`
        : `No regressions detected — ${result.summary}`,
    });
  },
});

// ============================================
// INTERNAL QUERIES
// ============================================

export const getRecentMergedTasks = internalQuery({
  args: { organizationId: v.id("organizations") },
  returns: v.array(
    v.object({
      _id: v.id("autopilotTasks"),
      title: v.string(),
      prUrl: v.optional(v.string()),
      prNumber: v.optional(v.number()),
    })
  ),
  handler: async (ctx, args) => {
    const twoDaysAgo = Date.now() - 2 * 24 * 60 * 60 * 1000;
    const tasks = await ctx.db
      .query("autopilotTasks")
      .withIndex("by_org_status", (q) =>
        q.eq("organizationId", args.organizationId).eq("status", "completed")
      )
      .collect();

    return tasks
      .filter((t) => t.completedAt && t.completedAt > twoDaysAgo && t.prUrl)
      .map((t) => ({
        _id: t._id,
        title: t.title,
        prUrl: t.prUrl ?? undefined,
        prNumber: t.prNumber ?? undefined,
      }));
  },
});
