import { v } from "convex/values";
import { z } from "zod";
import { internal } from "../../_generated/api";
import type { Id } from "../../_generated/dataModel";
import {
  type ActionCtx,
  internalAction,
  internalMutation,
  internalQuery,
} from "../../_generated/server";
import { activityLogLevel, priority } from "../schema/validators";
import { QUALITY_MODELS } from "./models";
import { buildAgentPrompt, CTO_SYSTEM_PROMPT } from "./prompts";
import { generateObjectWithFallback } from "./shared_generation";

export const technicalSpecSchema = z.object({
  filesToModify: z.array(
    z.object({
      path: z.string().describe("Absolute file path relative to project root"),
      action: z
        .enum(["create", "modify", "delete"])
        .describe("Action to take on this file"),
      description: z.string().describe("What changes to make and why"),
    })
  ),
  dependencies: z.object({
    add: z.array(z.string()).describe("NPM/yarn packages to add"),
    remove: z.array(z.string()).describe("NPM/yarn packages to remove"),
  }),
  riskLevel: z
    .enum(["low", "medium", "high", "critical"])
    .describe("Overall risk assessment of the implementation"),
  estimatedComplexity: z
    .enum(["trivial", "simple", "moderate", "complex", "very_complex"])
    .describe("Estimated development complexity"),
  implementationPrompt: z
    .string()
    .describe(
      "Self-contained, detailed prompt for the dev agent. Include all context, code snippets, file paths, patterns to follow, specific implementation details, and acceptance criteria. Must be actionable without additional context."
    ),
  testRequirements: z
    .array(z.string())
    .describe("Specific tests that must pass"),
  acceptanceCriteria: z
    .array(z.string())
    .describe("Measurable acceptance criteria for the implementation"),
  architectureNotes: z
    .string()
    .describe(
      "Architectural considerations or patterns to follow, or empty string if none"
    ),
});

export const getRepoAnalysisForCto = internalQuery({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    const analysis = await ctx.db
      .query("repoAnalysis")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .order("desc")
      .first();

    return analysis;
  },
});

export const getAgentsMd = internalQuery({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    const analysis = await ctx.db
      .query("repoAnalysis")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .order("desc")
      .first();

    return analysis?.repoStructure ?? null;
  },
});

export const updateTaskWithSpec = internalMutation({
  args: {
    taskId: v.id("autopilotWorkItems"),
    technicalSpec: v.string(),
    acceptanceCriteria: v.array(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.taskId, {
      acceptanceCriteria: args.acceptanceCriteria,
      updatedAt: Date.now(),
    });
    return null;
  },
});

interface CreateDevSubtaskArgs {
  acceptanceCriteria: string[];
  estimatedComplexity: string;
  implementationPrompt: string;
  organizationId: Id<"organizations">;
  parentTaskId: Id<"autopilotWorkItems">;
  priority: "critical" | "high" | "low" | "medium";
  title: string;
}

const createDevSubtaskHandler = async (
  ctx: ActionCtx,
  args: CreateDevSubtaskArgs
): Promise<Id<"autopilotWorkItems"> | null> => {
  const workItemId: Id<"autopilotWorkItems"> | null = await ctx.runMutation(
    internal.autopilot.task_mutations.createTask,
    {
      organizationId: args.organizationId,
      type: "task",
      title: args.title,
      description: args.implementationPrompt,
      priority: args.priority,
      assignedAgent: "dev",
      parentId: args.parentTaskId,
      acceptanceCriteria: args.acceptanceCriteria,
      needsReview: false,
      createdBy: "cto",
    }
  );

  if (!workItemId) {
    await ctx.runMutation(internal.autopilot.task_mutations.logActivity, {
      organizationId: args.organizationId,
      taskId: args.parentTaskId,
      agent: "cto",
      targetAgent: "dev",
      level: "warning",
      message: `Skipped dev subtask: ${args.title}`,
      details: `Task caps prevented creation. Complexity: ${args.estimatedComplexity}`,
    });
    return null;
  }

  await ctx.runMutation(internal.autopilot.task_mutations.logActivity, {
    organizationId: args.organizationId,
    taskId: workItemId,
    agent: "cto",
    targetAgent: "dev",
    level: "action",
    message: `Technical spec ready: ${args.title}`,
    details: `Complexity: ${args.estimatedComplexity}`,
  });

  return workItemId;
};

export const createDevSubtask = internalAction({
  args: {
    organizationId: v.id("organizations"),
    parentTaskId: v.id("autopilotWorkItems"),
    title: v.string(),
    implementationPrompt: v.string(),
    priority,
    estimatedComplexity: v.string(),
    acceptanceCriteria: v.array(v.string()),
  },
  returns: v.union(v.id("autopilotWorkItems"), v.null()),
  handler: async (ctx, args): Promise<Id<"autopilotWorkItems"> | null> =>
    createDevSubtaskHandler(ctx, args),
});

export const logCtoActivity = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    taskId: v.id("autopilotWorkItems"),
    level: activityLogLevel,
    message: v.string(),
    details: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.insert("autopilotActivityLog", {
      organizationId: args.organizationId,
      workItemId: args.taskId,
      agent: "cto",
      level: args.level,
      message: args.message,
      details: args.details,
      createdAt: Date.now(),
    });
    return null;
  },
});

const CTO_MODELS = QUALITY_MODELS;

export const runCTOSpecGeneration = internalAction({
  args: {
    organizationId: v.id("organizations"),
    taskId: v.id("autopilotWorkItems"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Guard check: ensure budget/rate limits allow execution
    const guardResult = await ctx.runQuery(
      internal.autopilot.guards.checkGuards,
      { organizationId: args.organizationId, agent: "cto" }
    );
    if (!guardResult.allowed) {
      return null;
    }

    // Load the PM task
    const task = await ctx.runQuery(internal.autopilot.task_queries.getTask, {
      taskId: args.taskId,
    });

    if (!task) {
      throw new Error(`Task not found: ${args.taskId}`);
    }

    // Log start
    await ctx.runMutation(internal.autopilot.agents.cto.logCtoActivity, {
      organizationId: args.organizationId,
      taskId: args.taskId,
      level: "action",
      message: "Starting technical specification generation",
      details: `Task: ${task.title}`,
    });

    try {
      // Load repo analysis
      const repoAnalysis = await ctx.runQuery(
        internal.autopilot.agents.cto.getRepoAnalysisForCto,
        { organizationId: args.organizationId }
      );

      // Load coding guidelines
      const agentsMd = await ctx.runQuery(
        internal.autopilot.agents.cto.getAgentsMd,
        { organizationId: args.organizationId }
      );

      // Build comprehensive context
      const repoContext = repoAnalysis
        ? `
## Repository Context

**Summary**: ${repoAnalysis.summary || "No summary available"}

**Tech Stack**: ${repoAnalysis.techStack || "No tech stack information"}

**Architecture**: ${repoAnalysis.architecture || "No architecture information"}

**Key Features**: ${repoAnalysis.features || "No features listed"}

**Repository Structure**:
${repoAnalysis.repoStructure || "No structure information"}
`
        : "No repository analysis available yet.";

      const codingGuidelines = agentsMd
        ? `## Coding Guidelines and Standards\n\n${agentsMd}`
        : "Use standard best practices and modern TypeScript patterns.";

      // Build the system prompt for CTO using centralized prompt
      const systemPrompt = buildAgentPrompt(
        CTO_SYSTEM_PROMPT,
        "",
        `${repoContext}\n\n${codingGuidelines}`
      );

      // Build user prompt with task details
      const userPrompt = `Please generate a detailed technical specification for the following task:

**Title**: ${task.title}

**Description**: ${task.description}

**Priority**: ${task.priority}

**Requirements**:
- Generate exact file paths relative to the project root
- Include specific code snippets and patterns to follow
- Provide the implementation prompt as a complete, self-contained prompt that a developer can execute autonomously
- Estimate risk (low/medium/high/critical) based on complexity and scope
- Estimate complexity (trivial/simple/moderate/complex/very_complex)
- List specific tests that must pass
- Define measurable acceptance criteria

Create a specification that a developer can execute without asking clarifying questions.`;

      // Call LLM with fallback
      const spec = await generateObjectWithFallback({
        models: CTO_MODELS,
        schema: technicalSpecSchema,
        systemPrompt,
        prompt: userPrompt,
        temperature: 0.7,
        maxOutputTokens: 4000,
      });

      // Update task with technical spec
      await ctx.runMutation(internal.autopilot.agents.cto.updateTaskWithSpec, {
        taskId: args.taskId,
        technicalSpec: JSON.stringify(spec, null, 2),
        acceptanceCriteria: spec.acceptanceCriteria,
      });

      // Create dev subtask
      const devTaskId = await ctx.runAction(
        internal.autopilot.agents.cto.createDevSubtask,
        {
          organizationId: args.organizationId,
          parentTaskId: args.taskId,
          title: `Dev: ${task.title}`,
          implementationPrompt: spec.implementationPrompt,
          priority: task.priority,
          estimatedComplexity: spec.estimatedComplexity,
          acceptanceCriteria: spec.acceptanceCriteria,
        }
      );

      if (!devTaskId) {
        await ctx.runMutation(
          internal.autopilot.task_mutations.updateTaskStatus,
          {
            taskId: args.taskId,
            status: "todo",
          }
        );
        return null;
      }

      // Mark CTO task as completed
      await ctx.runMutation(
        internal.autopilot.task_mutations.updateTaskStatus,
        {
          taskId: args.taskId,
          status: "done",
        }
      );

      // Log success
      await ctx.runMutation(internal.autopilot.agents.cto.logCtoActivity, {
        organizationId: args.organizationId,
        taskId: args.taskId,
        level: "success",
        message: "Technical specification completed",
        details: `Created dev subtask: ${devTaskId} | Risk: ${spec.riskLevel} | Complexity: ${spec.estimatedComplexity}`,
      });
      return null;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      // Mark task as failed
      await ctx.runMutation(
        internal.autopilot.task_mutations.updateTaskStatus,
        {
          taskId: args.taskId,
          status: "cancelled",
          errorMessage,
        }
      );

      // Log failure
      await ctx.runMutation(internal.autopilot.agents.cto.logCtoActivity, {
        organizationId: args.organizationId,
        taskId: args.taskId,
        level: "error",
        message: "Technical specification generation failed",
        details: errorMessage,
      });

      throw error;
    }
  },
});
