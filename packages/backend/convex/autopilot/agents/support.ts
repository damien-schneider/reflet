/**
 * Support Agent — triages support conversations, drafts replies,
 * escalates bugs to PM, and notifies users when features ship.
 *
 * Flow:
 *   1. Scan new/unresolved support conversations
 *   2. Use product knowledge to draft contextual replies
 *   3. Escalate bugs/feature requests to PM as tasks
 *   4. Watch completed tasks and notify linked feedback authors
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
import { FAST_MODELS } from "./models";
import { generateObjectWithFallback } from "./shared_generation";

// ============================================
// ZOD SCHEMAS
// ============================================

export const triageResultSchema = z.object({
  conversations: z.array(
    z.object({
      conversationId: z.string(),
      intent: z.enum(["question", "bug_report", "feature_request", "praise"]),
      severity: z.enum(["low", "medium", "high", "critical"]),
      suggestedReply: z.string(),
      shouldEscalate: z.boolean(),
      escalationReason: z
        .string()
        .describe("Reason for escalation, or empty string if not escalating"),
      relatedFeature: z
        .string()
        .describe("Related feature name, or empty string if none"),
    })
  ),
  summary: z.string(),
});

export const shippedNotificationSchema = z.object({
  notifications: z.array(
    z.object({
      feedbackTitle: z.string(),
      message: z.string(),
      taskTitle: z.string(),
    })
  ),
});

// ============================================
// SUPPORT TRIAGE
// ============================================

interface TriagedConversation {
  conversationId: string;
  escalationReason: string;
  intent: string;
  relatedFeature: string;
  severity: string;
  shouldEscalate: boolean;
  suggestedReply: string;
}

async function processTriagedConversation(
  ctx: ActionCtx,
  organizationId: Id<"organizations">,
  conv: TriagedConversation
) {
  await ctx.runMutation(internal.autopilot.documents.createDocument, {
    organizationId,
    type: "support_thread",
    title: `Reply draft: ${conv.conversationId}`,
    content: conv.suggestedReply,
    sourceAgent: "support",
    needsReview: true,
    reviewType: "support_reply",
    tags: ["support", conv.severity],
    metadata: JSON.stringify({
      conversationId: conv.conversationId,
      intent: conv.intent,
      severity: conv.severity,
    }),
  });

  if (!conv.shouldEscalate) {
    return;
  }

  await ctx.runMutation(internal.autopilot.documents.createDocument, {
    organizationId,
    type: "support_thread",
    title: `Escalation: ${conv.intent} — ${conv.escalationReason || "Needs attention"}`,
    content:
      conv.escalationReason || "Support conversation requires escalation",
    sourceAgent: "support",
    needsReview: true,
    reviewType: "support_escalation",
    tags: ["support", "escalation"],
    metadata: JSON.stringify({
      conversationId: conv.conversationId,
      intent: conv.intent,
    }),
  });

  const needsPmTask =
    conv.intent === "bug_report" || conv.intent === "feature_request";
  if (!needsPmTask) {
    return;
  }

  const label = conv.intent === "bug_report" ? "Bug" : "Feature request";
  await ctx.runMutation(internal.autopilot.task_mutations.createTask, {
    organizationId,
    title: `[Support] ${label}: ${conv.relatedFeature || conv.conversationId}`,
    description: conv.escalationReason ?? conv.suggestedReply,
    priority: conv.severity === "critical" ? "critical" : "high",
    assignedAgent: "pm",
    createdBy: "support_escalation",
  });
}

export const runSupportTriage = internalAction({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    // Guard check: ensure budget/rate limits allow execution
    const guardResult = await ctx.runQuery(
      internal.autopilot.guards.checkGuards,
      { organizationId: args.organizationId, agent: "support" }
    );
    if (!guardResult.allowed) {
      return;
    }

    await ctx.runMutation(internal.autopilot.task_mutations.logActivity, {
      organizationId: args.organizationId,
      agent: "support",
      level: "action",
      message: "Starting support triage scan",
    });

    const conversations = await ctx.runQuery(
      internal.autopilot.agents.support.getRecentConversations,
      { organizationId: args.organizationId }
    );

    if (conversations.length === 0) {
      await ctx.runMutation(internal.autopilot.task_mutations.logActivity, {
        organizationId: args.organizationId,
        agent: "support",
        level: "info",
        message: "No new support conversations to triage",
      });
      return;
    }

    const org = await ctx.runQuery(
      internal.autopilot.task_queries.getOrganization,
      {
        id: args.organizationId,
      }
    );

    const conversationSummaries = conversations
      .map(
        (c: { _id: string; subject?: string; lastMessage?: string }) =>
          `[${c._id}] ${c.subject ?? "No subject"}: ${c.lastMessage ?? "No messages"}`
      )
      .join("\n");

    const triage = await generateObjectWithFallback({
      models: FAST_MODELS,
      schema: triageResultSchema,
      systemPrompt: `You are a support triage agent for ${org?.name ?? "the product"}. 
Analyze support conversations and:
1. Classify the intent (question, bug, feature request, praise)
2. Assess severity
3. Draft a helpful, empathetic reply
4. Flag conversations that need human escalation (critical bugs, angry users, complex issues)`,
      prompt: `Triage these support conversations:\n\n${conversationSummaries}`,
    });

    for (const conv of triage.conversations) {
      await processTriagedConversation(ctx, args.organizationId, conv);
    }

    // Complete any in_progress tasks assigned to support
    await ctx.runMutation(
      internal.autopilot.task_mutations.completeAgentTasks,
      {
        organizationId: args.organizationId,
        agent: "support",
      }
    );

    await ctx.runMutation(internal.autopilot.task_mutations.logActivity, {
      organizationId: args.organizationId,
      agent: "support",
      level: "success",
      message: `Triaged ${triage.conversations.length} conversations — ${triage.summary}`,
    });
  },
});

// ============================================
// SHIPPED NOTIFICATIONS
// ============================================

export const notifyFeatureShipped = internalAction({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    const recentlyCompleted = await ctx.runQuery(
      internal.autopilot.agents.support.getRecentlyCompletedTasks,
      { organizationId: args.organizationId }
    );

    if (recentlyCompleted.length === 0) {
      return;
    }

    const taskSummaries = recentlyCompleted
      .map(
        (t: { title: string; description: string }) =>
          `- ${t.title}: ${t.description}`
      )
      .join("\n");

    const notifications = await generateObjectWithFallback({
      models: FAST_MODELS,
      schema: shippedNotificationSchema,
      systemPrompt:
        "You draft brief, friendly 'shipped' notifications to inform users about features they requested.",
      prompt: `These tasks were recently completed. Draft notification messages for each:\n\n${taskSummaries}`,
    });

    for (const notification of notifications.notifications) {
      await ctx.runMutation(internal.autopilot.documents.createDocument, {
        organizationId: args.organizationId,
        type: "note",
        title: `Shipped: ${notification.taskTitle}`,
        content: notification.message,
        sourceAgent: "support",
        tags: ["shipped"],
      });
    }

    await ctx.runMutation(internal.autopilot.task_mutations.logActivity, {
      organizationId: args.organizationId,
      agent: "support",
      level: "success",
      message: `Generated ${notifications.notifications.length} shipped notifications`,
    });
  },
});

// ============================================
// INTERNAL QUERIES
// ============================================

export const getRecentConversations = internalQuery({
  args: { organizationId: v.id("organizations") },
  returns: v.array(
    v.object({
      _id: v.id("supportConversations"),
      _creationTime: v.number(),
      subject: v.optional(v.string()),
      lastMessage: v.optional(v.string()),
      status: v.string(),
    })
  ),
  handler: async (ctx, args) => {
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
    const conversations = await ctx.db
      .query("supportConversations")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .order("desc")
      .take(50);

    const conversationsWithMessages = await Promise.all(
      conversations
        .filter((c) => c.status === "open" && c._creationTime > oneDayAgo)
        .map(async (c) => {
          const latestMessage = await ctx.db
            .query("supportMessages")
            .withIndex("by_conversation_created", (q) =>
              q.eq("conversationId", c._id)
            )
            .order("desc")
            .first();

          return {
            _id: c._id,
            _creationTime: c._creationTime,
            subject: c.subject ?? undefined,
            lastMessage: latestMessage?.body,
            status: c.status,
          };
        })
    );

    return conversationsWithMessages;
  },
});

export const getRecentlyCompletedTasks = internalQuery({
  args: { organizationId: v.id("organizations") },
  returns: v.array(
    v.object({
      _id: v.id("autopilotWorkItems"),
      title: v.string(),
      description: v.string(),
    })
  ),
  handler: async (ctx, args) => {
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
    const items = await ctx.db
      .query("autopilotWorkItems")
      .withIndex("by_org_status", (q) =>
        q.eq("organizationId", args.organizationId).eq("status", "done")
      )
      .collect();

    return items
      .filter((w) => w.updatedAt > oneDayAgo)
      .map((w) => ({
        _id: w._id,
        title: w.title,
        description: w.description,
      }));
  },
});
