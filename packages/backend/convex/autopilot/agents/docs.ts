/**
 * Docs Agent — detects stale documentation, generates FAQ entries from
 * support data, and creates doc update tasks when API/UI changes ship.
 *
 * Flow:
 *   1. Scan recently merged PRs for API or UI changes
 *   2. Compare doc references against current codebase
 *   3. Mine support conversations for recurring questions → FAQ
 *   4. Create tasks for doc updates and flag stale content
 */

import { v } from "convex/values";
import { z } from "zod";
import { internal } from "../../_generated/api";
import { internalAction, internalQuery } from "../../_generated/server";
import { MODELS } from "./models";
import { generateObjectWithFallback } from "./shared";

const DOCS_MODELS = [MODELS.FREE, MODELS.FAST] as const;

// ============================================
// ZOD SCHEMAS
// ============================================

export const docsCheckSchema = z.object({
  updates: z.array(
    z.object({
      section: z.string(),
      reason: z.string(),
      priority: z.enum(["low", "medium", "high"]),
      suggestedContent: z
        .string()
        .describe("Suggested content for the update, or empty string if none"),
    })
  ),
  stalePages: z.array(
    z.object({
      page: z.string(),
      reason: z.string(),
      lastRelevantChange: z
        .string()
        .describe(
          "Last relevant change that made this page stale, or empty string if unknown"
        ),
    })
  ),
  faqEntries: z.array(
    z.object({
      question: z.string(),
      answer: z.string(),
      category: z.string(),
    })
  ),
  summary: z.string(),
});

// ============================================
// DOC CHECK (triggered by PR merge or weekly cron)
// ============================================

export const runDocsCheck = internalAction({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    await ctx.runMutation(internal.autopilot.tasks.logActivity, {
      organizationId: args.organizationId,
      agent: "docs",
      level: "action",
      message: "Running documentation freshness check",
    });

    // Get recently completed tasks (proxy for shipped changes)
    const completedTasks = await ctx.runQuery(
      internal.autopilot.agents.docs.getRecentCompletedTasks,
      { organizationId: args.organizationId }
    );

    // Get support data for FAQ generation
    const supportConversations = await ctx.runQuery(
      internal.autopilot.agents.support.getRecentConversations,
      { organizationId: args.organizationId }
    );

    const org = await ctx.runQuery(internal.autopilot.tasks.getOrganization, {
      id: args.organizationId,
    });

    const taskSummaries =
      completedTasks.length > 0
        ? completedTasks
            .map(
              (t: { title: string; description: string }) =>
                `- ${t.title}: ${t.description}`
            )
            .join("\n")
        : "No recently shipped changes";

    const supportSummary =
      supportConversations.length > 0
        ? `${supportConversations.length} recent support conversations found`
        : "No recent support conversations";

    const result = await generateObjectWithFallback({
      models: DOCS_MODELS,
      schema: docsCheckSchema,
      systemPrompt: `You are a documentation agent for ${org?.name ?? "the product"}.
Analyze recent changes and support data to:
1. Identify documentation that needs updating based on shipped features
2. Flag potentially stale documentation
3. Generate FAQ entries from common support questions`,
      prompt: `Check documentation freshness:

Recently shipped changes:
${taskSummaries}

Support activity: ${supportSummary}

Identify: doc updates needed, stale pages, and FAQ entries to add.`,
    });

    // Create inbox items for doc updates
    for (const update of result.updates) {
      await ctx.runMutation(internal.autopilot.inbox.createInboxItem, {
        organizationId: args.organizationId,
        type: "docs_update",
        title: `Doc update: ${update.section}`,
        summary: update.reason,
        content: update.suggestedContent,
        sourceAgent: "docs",
        priority: update.priority === "high" ? "high" : "medium",
        metadata: JSON.stringify(update),
      });
    }

    // Create inbox items for stale docs
    for (const stale of result.stalePages) {
      await ctx.runMutation(internal.autopilot.inbox.createInboxItem, {
        organizationId: args.organizationId,
        type: "docs_stale",
        title: `Stale doc: ${stale.page}`,
        summary: stale.reason,
        sourceAgent: "docs",
        priority: "low",
        metadata: JSON.stringify(stale),
        autoApproved: true,
      });
    }

    // Create dev task for doc updates if high-priority updates exist
    const highPriorityUpdates = result.updates.filter(
      (u) => u.priority === "high"
    );
    if (highPriorityUpdates.length > 0) {
      await ctx.runMutation(internal.autopilot.tasks.createTask, {
        organizationId: args.organizationId,
        title: `Update documentation: ${highPriorityUpdates.length} high-priority sections`,
        description: highPriorityUpdates
          .map((u) => `- ${u.section}: ${u.reason}`)
          .join("\n"),
        priority: "medium",
        assignedAgent: "dev",
        origin: "docs_update",
        autonomyLevel: "review_required",
      });
    }

    await ctx.runMutation(internal.autopilot.tasks.logActivity, {
      organizationId: args.organizationId,
      agent: "docs",
      level: "success",
      message: `Docs check complete — ${result.updates.length} updates, ${result.stalePages.length} stale pages, ${result.faqEntries.length} FAQs — ${result.summary}`,
    });
  },
});

// ============================================
// STALE DOCS CHECK (weekly cron)
// ============================================

export const runDocsStaleCheck = internalAction({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    // Delegate to the full docs check which includes stale detection
    await ctx.runAction(internal.autopilot.agents.docs.runDocsCheck, {
      organizationId: args.organizationId,
    });
  },
});

// ============================================
// INTERNAL QUERIES
// ============================================

export const getRecentCompletedTasks = internalQuery({
  args: { organizationId: v.id("organizations") },
  returns: v.array(
    v.object({
      _id: v.id("autopilotTasks"),
      title: v.string(),
      description: v.string(),
      prUrl: v.optional(v.string()),
    })
  ),
  handler: async (ctx, args) => {
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const tasks = await ctx.db
      .query("autopilotTasks")
      .withIndex("by_org_status", (q) =>
        q.eq("organizationId", args.organizationId).eq("status", "completed")
      )
      .collect();

    return tasks
      .filter((t) => t.completedAt && t.completedAt > sevenDaysAgo)
      .map((t) => ({
        _id: t._id,
        title: t.title,
        description: t.description,
        prUrl: t.prUrl ?? undefined,
      }));
  },
});
