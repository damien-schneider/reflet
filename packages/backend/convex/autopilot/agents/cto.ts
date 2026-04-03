/**
 * CTO Agent — Technical Specification Generator
 *
 * Receives PM tasks and converts them into detailed technical specifications
 * using an LLM. The CTO understands the codebase architecture and generates
 * self-contained implementation prompts for the Dev agent.
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

// ============================================
// ZOD SCHEMA
// ============================================

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
    .optional()
    .describe("Optional architectural considerations or patterns to follow"),
});

// ============================================
// INTERNAL QUERIES
// ============================================

/**
 * Get repo analysis for technical context
 */
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

/**
 * Get AGENTS.md content if available.
 * Loads from repo analysis data if the repo was analyzed.
 */
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

    // repoStructure may contain AGENTS.md content from analysis
    // Return null if no analysis exists yet
    return analysis?.repoStructure ?? null;
  },
});

// ============================================
// INTERNAL MUTATIONS
// ============================================

/**
 * Update task with technical specification
 */
export const updateTaskWithSpec = internalMutation({
  args: {
    taskId: v.id("autopilotTasks"),
    technicalSpec: v.string(),
    acceptanceCriteria: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.taskId, {
      technicalSpec: args.technicalSpec,
      acceptanceCriteria: args.acceptanceCriteria,
    });
  },
});

/**
 * Create a dev subtask from CTO specification
 */
export const createDevSubtask = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    parentTaskId: v.id("autopilotTasks"),
    title: v.string(),
    description: v.string(),
    implementationPrompt: v.string(),
    priority: v.union(
      v.literal("critical"),
      v.literal("high"),
      v.literal("medium"),
      v.literal("low")
    ),
    estimatedComplexity: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const taskId = await ctx.db.insert("autopilotTasks", {
      organizationId: args.organizationId,
      title: args.title,
      description: args.implementationPrompt,
      status: "pending",
      priority: args.priority,
      assignedAgent: "dev",
      origin: "cto_breakdown",
      autonomyLevel: "full_auto",
      parentTaskId: args.parentTaskId,
      blockedByTaskId: args.parentTaskId,
      retryCount: 0,
      maxRetries: 3,
      createdAt: now,
    });

    // Log subtask creation
    await ctx.db.insert("autopilotActivityLog", {
      organizationId: args.organizationId,
      taskId,
      agent: "cto",
      level: "action",
      message: `Created dev subtask: ${args.title}`,
      details: `Complexity: ${args.estimatedComplexity}`,
      createdAt: now,
    });

    return taskId;
  },
});

/**
 * Log CTO activity
 */
export const logCtoActivity = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    taskId: v.id("autopilotTasks"),
    level: v.string(),
    message: v.string(),
    details: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("autopilotActivityLog", {
      organizationId: args.organizationId,
      taskId: args.taskId,
      agent: "cto",
      level: args.level as "info" | "action" | "success" | "warning" | "error",
      message: args.message,
      details: args.details,
      createdAt: Date.now(),
    });
  },
});

// ============================================
// MODEL CONSTANTS
// ============================================

const CTO_MODELS = [MODELS.SMART, MODELS.FAST] as const;

// ============================================
// MAIN ACTION
// ============================================

/**
 * Run CTO specification generation for a task
 *
 * 1. Load the PM task
 * 2. Load repo analysis and coding guidelines
 * 3. Call LLM to generate technical spec
 * 4. Update task with spec and create dev subtask
 * 5. Mark CTO task as completed
 */
export const runCTOSpecGeneration = internalAction({
  args: {
    organizationId: v.id("organizations"),
    taskId: v.id("autopilotTasks"),
  },
  handler: async (ctx, args) => {
    // Load the PM task
    const task = await ctx.runQuery(internal.autopilot.tasks.getTask, {
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

      // Build the system prompt for CTO
      const systemPrompt = `You are the CTO (Chief Technology Officer) of a development team. Your role is to take high-level product requirements and break them down into detailed, actionable technical specifications that developers can execute on autonomously.

You understand:
- The existing codebase architecture and technology stack
- Coding standards and patterns used in the project
- Risk assessment and complexity estimation
- How to write clear, self-contained implementation prompts

When generating technical specifications, you produce:
1. **Files to Modify**: Exact file paths and changes needed
2. **Dependencies**: Any packages to add or remove
3. **Risk & Complexity**: Realistic assessments based on the codebase
4. **Implementation Prompt**: A detailed, self-contained prompt that a developer can execute without additional context
5. **Test Requirements**: Specific tests that must pass
6. **Acceptance Criteria**: Measurable success criteria

${repoContext}

${codingGuidelines}

Always prioritize:
- Code quality and zero technical debt
- Type safety and explicit intent
- Clear architectural patterns
- Comprehensive test coverage
- Self-contained implementation details`;

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
      const devTaskId = await ctx.runMutation(
        internal.autopilot.agents.cto.createDevSubtask,
        {
          organizationId: args.organizationId,
          parentTaskId: args.taskId,
          title: `Dev: ${task.title}`,
          description: `Implementation of technical specification for: ${task.title}`,
          implementationPrompt: spec.implementationPrompt,
          priority: task.priority,
          estimatedComplexity: spec.estimatedComplexity,
        }
      );

      // Mark CTO task as completed
      await ctx.runMutation(internal.autopilot.tasks.updateTaskStatus, {
        taskId: args.taskId,
        status: "completed",
      });

      // Log success
      await ctx.runMutation(internal.autopilot.agents.cto.logCtoActivity, {
        organizationId: args.organizationId,
        taskId: args.taskId,
        level: "success",
        message: "Technical specification completed",
        details: `Created dev subtask: ${devTaskId} | Risk: ${spec.riskLevel} | Complexity: ${spec.estimatedComplexity}`,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      // Mark task as failed
      await ctx.runMutation(internal.autopilot.tasks.updateTaskStatus, {
        taskId: args.taskId,
        status: "failed",
        errorMessage,
      });

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
