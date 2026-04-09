/**
 * Initiative bootstrapping — creates initial roadmap initiatives
 * from the product knowledge base if none exist yet.
 */

import { z } from "zod";
import { internal } from "../../../_generated/api";
import type { Id } from "../../../_generated/dataModel";
import type { ActionCtx } from "../../../_generated/server";
import { QUALITY_MODELS } from "../models";
import { buildAgentPrompt, PM_SYSTEM_PROMPT } from "../prompts";
import { generateObjectWithFallback } from "../shared_generation";

// ============================================
// SCHEMA
// ============================================

const initiativeBootstrapSchema = z.object({
  initiatives: z.array(
    z.object({
      title: z.string().describe("Initiative/epic title"),
      description: z.string().describe("What this initiative aims to achieve"),
      priority: z
        .enum(["critical", "high", "medium", "low"])
        .describe("Priority level"),
      successMetrics: z.string().describe("How to measure success"),
    })
  ),
});

const PM_MODELS = QUALITY_MODELS;

// ============================================
// INITIATIVE BOOTSTRAPPING
// ============================================

/**
 * Create initiatives if none exist yet.
 * Reads knowledge base (product roadmap, goals) and generates 2-3
 * initial initiatives so the Roadmap page has content.
 */
export const bootstrapInitiativesIfNeeded = async (
  ctx: {
    runQuery: ActionCtx["runQuery"];
    runMutation: ActionCtx["runMutation"];
  },
  organizationId: Id<"organizations">,
  agentKnowledge?: string
): Promise<void> => {
  const allItems = await ctx.runQuery(
    internal.autopilot.task_queries.getTasksByOrg,
    {
      organizationId,
    }
  );
  const existingInitiatives = allItems.filter(
    (item: { type: string }) => item.type === "initiative"
  );

  if (existingInitiatives.length > 0) {
    return;
  }

  try {
    const systemPrompt = buildAgentPrompt(
      PM_SYSTEM_PROMPT,
      "",
      "",
      agentKnowledge
    );

    const result = await generateObjectWithFallback({
      models: PM_MODELS,
      schema: initiativeBootstrapSchema,
      systemPrompt,
      prompt: `Based on the product knowledge base, create 2-3 strategic initiatives (epics) for the product roadmap.

Each initiative should be a major product theme that can contain multiple user stories and tasks.

Examples of good initiatives:
- "Improve Onboarding Experience" — reduce time-to-value for new users
- "Enterprise Features" — add SSO, audit logs, team management
- "Performance & Reliability" — reduce load times, improve uptime

Base your initiatives on context from the knowledge base. If no context is available, create sensible defaults for a SaaS product.`,
    });

    for (const initiative of result.initiatives) {
      await ctx.runMutation(internal.autopilot.task_mutations.createTask, {
        organizationId,
        title: initiative.title,
        description: initiative.description,
        priority: initiative.priority,
        assignedAgent: "pm",
        type: "initiative",
        createdBy: "pm",
        tags: [initiative.successMetrics],
      });
    }

    await ctx.runMutation(internal.autopilot.task_mutations.logActivity, {
      organizationId,
      agent: "pm",
      level: "success",
      message: `Bootstrapped ${result.initiatives.length} roadmap initiatives`,
      details: result.initiatives.map((i) => i.title).join(", "),
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    await ctx.runMutation(internal.autopilot.task_mutations.logActivity, {
      organizationId,
      agent: "pm",
      level: "warning",
      message: `Failed to bootstrap initiatives: ${msg}`,
    });
  }
};
