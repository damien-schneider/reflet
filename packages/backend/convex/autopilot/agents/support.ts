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
import { type ActionCtx, internalAction } from "../../_generated/server";
import { MODELS } from "./models";
import { generateObjectWithFallback } from "./shared";

const SUPPORT_MODELS = [MODELS.FREE, MODELS.FAST] as const;

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

export const triageResultSchema = z.object({
  conversations: z.array(
    z.object({
      conversationId: z.string(),
      intent: z.enum(["question", "bug_report", "feature_request", "praise"]),
      severity: z.enum(["low", "medium", "high", "critical"]),
      suggestedReply: z.string(),
      shouldEscalate: z.boolean(),
      escalationReason: z.string().default(""),
      relatedFeature: z.string().default(""),
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
  await ctx.runMutation(internal.autopilot.inbox.createInboxItem, {
    organizationId,
    type: "support_reply",
    title: `Reply draft: ${conv.conversationId}`,
    summary: conv.suggestedReply.slice(0, 200),
    content: conv.suggestedReply,
    sourceAgent: "support",
    priority: conv.severity === "critical" ? "critical" : "medium",
    metadata: JSON.stringify({
      conversationId: conv.conversationId,
      intent: conv.intent,
      severity: conv.severity,
    }),
  });

  if (!conv.shouldEscalate) {
    return;
  }

  await ctx.runMutation(internal.autopilot.inbox.createInboxItem, {
    organizationId,
    type: "support_escalation",
    title: `Escalation: ${conv.intent} — ${conv.escalationReason || "Needs attention"}`,
    summary:
      conv.escalationReason || "Support conversation requires escalation",
    sourceAgent: "support",
    priority: severityToPriority(conv.severity),
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
  await ctx.runMutation(internal.autopilot.tasks.createTask, {
    organizationId,
    title: `[Support] ${label}: ${conv.relatedFeature || conv.conversationId}`,
    description: conv.escalationReason ?? conv.suggestedReply,
    priority: conv.severity === "critical" ? "critical" : "high",
    assignedAgent: "pm",
    origin: "support_escalation",
    autonomyLevel: "review_required",
  });
}

export const runSupportTriage = internalAction({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    await ctx.runMutation(internal.autopilot.tasks.logActivity, {
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
      await ctx.runMutation(internal.autopilot.tasks.logActivity, {
        organizationId: args.organizationId,
        agent: "support",
        level: "info",
        message: "No new support conversations to triage",
      });
      return;
    }

    const org = await ctx.runQuery(internal.autopilot.tasks.getOrganization, {
      id: args.organizationId,
    });

    const conversationSummaries = conversations
      .map(
        (c: { _id: string; subject?: string; lastMessage?: string }) =>
          `[${c._id}] ${c.subject ?? "No subject"}: ${c.lastMessage ?? "No messages"}`
      )
      .join("\n");

    const triage = await generateObjectWithFallback({
      models: SUPPORT_MODELS,
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

    await ctx.runMutation(internal.autopilot.tasks.logActivity, {
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
      models: SUPPORT_MODELS,
      schema: shippedNotificationSchema,
      systemPrompt:
        "You draft brief, friendly 'shipped' notifications to inform users about features they requested.",
      prompt: `These tasks were recently completed. Draft notification messages for each:\n\n${taskSummaries}`,
    });

    for (const notification of notifications.notifications) {
      await ctx.runMutation(internal.autopilot.inbox.createInboxItem, {
        organizationId: args.organizationId,
        type: "shipped_notification",
        title: `Shipped: ${notification.taskTitle}`,
        summary: notification.message,
        sourceAgent: "support",
        priority: "low",
      });
    }

    await ctx.runMutation(internal.autopilot.tasks.logActivity, {
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

import { internalQuery } from "../../_generated/server";

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

    return conversations
      .filter((c) => c.status === "open" && c._creationTime > oneDayAgo)
      .map((c) => ({
        _id: c._id,
        _creationTime: c._creationTime,
        subject: c.subject ?? undefined,
        lastMessage: undefined,
        status: c.status,
      }));
  },
});

export const getRecentlyCompletedTasks = internalQuery({
  args: { organizationId: v.id("organizations") },
  returns: v.array(
    v.object({
      _id: v.id("autopilotTasks"),
      title: v.string(),
      description: v.string(),
    })
  ),
  handler: async (ctx, args) => {
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
    const tasks = await ctx.db
      .query("autopilotTasks")
      .withIndex("by_org_status", (q) =>
        q.eq("organizationId", args.organizationId).eq("status", "completed")
      )
      .collect();

    return tasks
      .filter((t) => t.completedAt && t.completedAt > oneDayAgo)
      .map((t) => ({
        _id: t._id,
        title: t.title,
        description: t.description,
      }));
  },
});
