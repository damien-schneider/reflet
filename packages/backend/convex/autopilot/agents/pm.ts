/**
 * PM (Product Manager) Agent — analyzes feedback and creates prioritized tasks.
 *
 * Phase 3.2: The PM agent reads feedback items, intelligence insights, and
 * existing tasks, then uses AI to generate a prioritized set of autopilot tasks.
 *
 * Scoring formula:
 * - voteWeight (0-25): User votes on the feedback
 * - aiPriorityWeight (0-20): AI-assessed priority from auto-tagging
 * - intelligenceWeight (0-15): Competitor gaps, community signals
 * - competitorGapWeight (0-15): Identified competitive advantages
 * - revenueWeight (0-15): Revenue impact or opportunity
 * - recencyWeight (0-10): Recent signals are weighted higher
 */

import { v } from "convex/values";
import { z } from "zod";
import { internal } from "../../_generated/api";
import { internalAction, internalQuery } from "../../_generated/server";
import { MODELS } from "./models";
import { generateObjectWithFallback } from "./shared";

// ============================================
// SCHEMA & TYPES
// ============================================

export const pmAnalysisSchema = z.object({
  tasks: z.array(
    z.object({
      title: z.string().describe("Short, actionable task title"),
      description: z
        .string()
        .describe("Detailed description of what needs to be done"),
      priority: z
        .enum(["critical", "high", "medium", "low"])
        .describe("Task priority level"),
      assignedAgent: z
        .enum(["cto", "dev", "security", "architect", "growth"])
        .describe("Agent responsible for this task"),
      acceptanceCriteria: z
        .array(z.string())
        .describe("Clear acceptance criteria for task completion"),
      reasoning: z
        .string()
        .describe("Why this task was created and its priority"),
    })
  ),
  summary: z.string().describe("Brief summary of the analysis performed"),
  skippedCount: z
    .number()
    .describe("Number of signals that didn't warrant tasks"),
});

// Model fallback chain — prioritizes cost-effective models
const PM_MODELS = [MODELS.FREE, MODELS.FAST] as const;

// ============================================
// INTERNAL QUERIES
// ============================================

/**
 * Get feedback items for a specific organization.
 * Returns feedback with vote counts and AI-assessed priority.
 */
export const getFeedbackForOrganization = internalQuery({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    const feedbackItems = await ctx.db
      .query("feedback")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .collect();

    // Filter out deleted and merged items
    const activeFeedback = feedbackItems.filter(
      (f) => !(f.deletedAt || f.isMerged)
    );

    // Get vote counts for each feedback item
    const feedbackWithVotes = await Promise.all(
      activeFeedback.map(async (feedback) => {
        const votes = await ctx.db
          .query("feedbackVotes")
          .withIndex("by_feedback", (q) => q.eq("feedbackId", feedback._id))
          .collect();

        return {
          _id: feedback._id,
          title: feedback.title,
          description: feedback.description || "",
          status: feedback.status,
          aiPriority: feedback.aiPriority,
          aiComplexity: feedback.aiComplexity,
          voteCount: votes.length,
          createdAt: feedback.createdAt,
          updatedAt: feedback.updatedAt,
        };
      })
    );

    return feedbackWithVotes;
  },
});

/**
 * Get all existing autopilot tasks for the organization to avoid duplicates.
 */
export const getExistingTasksForOrganization = internalQuery({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    const tasks = await ctx.db
      .query("autopilotTasks")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .collect();

    // Filter out completed/cancelled tasks
    const activeTasks = tasks.filter(
      (t) => t.status !== "completed" && t.status !== "cancelled"
    );

    return activeTasks.map((t) => ({
      _id: t._id,
      title: t.title,
      status: t.status,
      origin: t.origin,
    }));
  },
});

/**
 * Get intelligence insights (competitor gaps, community signals, etc).
 * These inform the PM's scoring and prioritization decisions.
 */
export const getIntelligenceInsights = internalQuery({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    // Query the intelligence module for recent insights
    // This is a placeholder — actual implementation depends on intelligence schema
    const insights = await ctx.db
      .query("intelligenceInsights")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .collect();

    return insights.map((insight) => ({
      _id: insight._id,
      type: insight.type,
      title: insight.title,
      summary: insight.summary,
      priority: insight.priority,
      createdAt: insight.createdAt,
    }));
  },
});

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Calculate a composite score for a feedback item based on multiple signals.
 */
const calculateFeedbackScore = (feedbackData: {
  voteCount: number;
  aiPriority?: string;
  recencyDays: number;
  hasCompetitorGap: boolean;
  revenueImpact: number;
}): number => {
  let score = 0;

  // Vote weight: 0-25 points
  // Assuming max 50 votes for normalization
  score += Math.min((feedbackData.voteCount / 50) * 25, 25);

  // AI priority weight: 0-20 points
  const priorityMap = {
    critical: 20,
    high: 15,
    medium: 10,
    low: 5,
    none: 0,
  } as const;
  score +=
    priorityMap[
      (feedbackData.aiPriority || "medium") as keyof typeof priorityMap
    ];

  // Competitor gap weight: 0-15 points
  if (feedbackData.hasCompetitorGap) {
    score += 15;
  }

  // Revenue weight: 0-15 points
  // Revenue impact is 0-1.0 scale
  score += feedbackData.revenueImpact * 15;

  // Recency weight: 0-10 points
  // More recent = higher score. 30 days or less = full points
  if (feedbackData.recencyDays <= 30) {
    score += 10;
  } else if (feedbackData.recencyDays <= 60) {
    score += 5;
  }

  return Math.round(score * 100) / 100;
};

// ============================================
// ACTIONS
// ============================================

/**
 * Main PM analysis action.
 * Reads feedback, existing tasks, and intelligence insights,
 * then generates and creates prioritized autopilot tasks.
 */
export const runPMAnalysis = internalAction({
  args: { organizationId: v.id("organizations") },
  returns: v.null(),
  handler: async (ctx, args) => {
    try {
      // 1. Query feedback items
      const feedbackItems = await ctx.runQuery(
        internal.autopilot.agents.pm.getFeedbackForOrganization,
        { organizationId: args.organizationId }
      );

      // 2. Query existing tasks to avoid duplicates
      const existingTasks = await ctx.runQuery(
        internal.autopilot.agents.pm.getExistingTasksForOrganization,
        { organizationId: args.organizationId }
      );

      // 3. Query intelligence insights
      const intelligenceInsights = await ctx.runQuery(
        internal.autopilot.agents.pm.getIntelligenceInsights,
        { organizationId: args.organizationId }
      );

      // Log the analysis start
      await ctx.runMutation(internal.autopilot.tasks.logActivity, {
        organizationId: args.organizationId,
        agent: "pm",
        level: "action",
        message: "Starting PM analysis",
        details: `Feedback items: ${feedbackItems.length} | Existing tasks: ${existingTasks.length}`,
      });

      // 4. Build context string for the LLM
      const feedbackContext = feedbackItems
        .map(
          (f: {
            title: string;
            voteCount: number;
            aiPriority?: string;
            description: string;
          }) =>
            `- "${f.title}" (${f.voteCount} votes, AI priority: ${f.aiPriority || "unassessed"}) - ${f.description}`
        )
        .join("\n");

      const existingTasksContext = existingTasks
        .map(
          (t: { title: string; status: string }) =>
            `- "${t.title}" (status: ${t.status})`
        )
        .join("\n");

      const intelligenceContext = intelligenceInsights
        .map(
          (i: { type: string; title: string; summary: string }) =>
            `- [${i.type}] ${i.title}: ${i.summary}`
        )
        .join("\n");

      const systemPrompt = `You are a Product Manager analyzing user feedback and market signals to create engineering tasks.

Your responsibilities:
1. Read feedback items (user-generated requests with vote counts)
2. Review existing tasks to avoid duplicates
3. Consider competitive intelligence and revenue signals
4. Generate prioritized tasks for the engineering team

Task assignment:
- "cto": Architecture reviews, technical planning, major refactors
- "dev": New features, bug fixes, implementations
- "security": Security vulnerabilities, compliance, data protection
- "architect": System design reviews, performance optimization
- "growth": Marketing, analytics, user acquisition features

Priority guidelines:
- critical: Blocking bugs, security issues, major revenue opportunities
- high: Important features, competitive gaps, retention risks
- medium: Standard features, nice-to-haves with good feedback
- low: Polish, minor improvements, future consideration

Be concise. Create only tasks that are truly necessary.`;

      const userPrompt = `Analyze this feedback and create actionable tasks for the engineering team.

FEEDBACK ITEMS:
${feedbackContext || "(none)"}

EXISTING TASKS (to avoid duplicating):
${existingTasksContext || "(none)"}

INTELLIGENCE INSIGHTS:
${intelligenceContext || "(none)"}

Generate tasks that address the highest-priority feedback items and intelligence gaps.
For each task, provide:
- A clear title and description
- Priority (critical/high/medium/low)
- Assigned agent (cto/dev/security/architect/growth)
- 2-3 acceptance criteria
- Reasoning for the task and priority`;

      // 5. Call LLM with fallback chain
      const pmOutput = await generateObjectWithFallback({
        models: PM_MODELS,
        schema: pmAnalysisSchema,
        systemPrompt,
        prompt: userPrompt,
      });

      // 6. Create tasks from the LLM output
      let createdCount = 0;
      for (const task of pmOutput.tasks) {
        // Check if a similar task already exists
        const existingTask = existingTasks.find(
          (t: { title: string; status: string }) =>
            t.title.toLowerCase() === task.title.toLowerCase() ||
            t.title.includes(task.title.slice(0, 10)) ||
            task.title.includes(t.title.slice(0, 10))
        );

        if (existingTask) {
          await ctx.runMutation(internal.autopilot.tasks.logActivity, {
            organizationId: args.organizationId,
            agent: "pm",
            level: "info",
            message: `Skipped duplicate task: "${task.title}"`,
            details: `Similar task exists: "${existingTask.title}"`,
          });
          continue;
        }

        // Create the task
        const taskId = await ctx.runMutation(
          internal.autopilot.tasks.createTask,
          {
            organizationId: args.organizationId,
            title: task.title,
            description: task.description,
            priority: task.priority,
            assignedAgent: task.assignedAgent,
            origin: "pm_analysis",
            autonomyLevel: "review_required",
            acceptanceCriteria: task.acceptanceCriteria,
          }
        );

        createdCount++;

        // Log task creation with reasoning
        await ctx.runMutation(internal.autopilot.tasks.logActivity, {
          organizationId: args.organizationId,
          taskId,
          agent: "pm",
          level: "success",
          message: `Task created: ${task.title}`,
          details: `Priority: ${task.priority} | Agent: ${task.assignedAgent} | Reasoning: ${task.reasoning}`,
        });
      }

      // 7. Log analysis completion
      await ctx.runMutation(internal.autopilot.tasks.logActivity, {
        organizationId: args.organizationId,
        agent: "pm",
        level: "success",
        message: "PM analysis complete",
        details: `Created ${createdCount} tasks | Skipped ${pmOutput.skippedCount} signals | Summary: ${pmOutput.summary}`,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";

      // Log the error
      await ctx.runMutation(internal.autopilot.tasks.logActivity, {
        organizationId: args.organizationId,
        agent: "pm",
        level: "error",
        message: "PM analysis failed",
        details: errorMessage,
      });

      throw new Error(`PM analysis failed: ${errorMessage}`);
    }
  },
});

export { calculateFeedbackScore };
