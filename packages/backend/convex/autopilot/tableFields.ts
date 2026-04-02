import { defineTable } from "convex/server";
import { v } from "convex/values";

// ============================================
// AUTOPILOT VALIDATORS
// ============================================

export const codingAdapterType = v.union(
  v.literal("builtin"),
  v.literal("copilot"),
  v.literal("codex"),
  v.literal("claude_code")
);

export const autonomyLevel = v.union(
  v.literal("full_auto"),
  v.literal("review_required"),
  v.literal("manual")
);

export const autopilotTaskStatus = v.union(
  v.literal("pending"),
  v.literal("in_progress"),
  v.literal("blocked"),
  v.literal("waiting_review"),
  v.literal("completed"),
  v.literal("failed"),
  v.literal("cancelled")
);

export const autopilotTaskPriority = v.union(
  v.literal("critical"),
  v.literal("high"),
  v.literal("medium"),
  v.literal("low")
);

export const assignedAgent = v.union(
  v.literal("pm"),
  v.literal("cto"),
  v.literal("dev"),
  v.literal("security"),
  v.literal("architect"),
  v.literal("growth"),
  v.literal("orchestrator")
);

export const taskOrigin = v.union(
  v.literal("pm_analysis"),
  v.literal("security_scan"),
  v.literal("architect_review"),
  v.literal("growth_suggestion"),
  v.literal("user_created"),
  v.literal("cto_breakdown")
);

export const runStatus = v.union(
  v.literal("queued"),
  v.literal("sandbox_starting"),
  v.literal("cloning"),
  v.literal("exploring"),
  v.literal("coding"),
  v.literal("testing"),
  v.literal("creating_pr"),
  v.literal("waiting_ci"),
  v.literal("ci_fixing"),
  v.literal("completed"),
  v.literal("failed"),
  v.literal("cancelled")
);

export const activityLogLevel = v.union(
  v.literal("info"),
  v.literal("action"),
  v.literal("success"),
  v.literal("warning"),
  v.literal("error")
);

export const activityLogAgent = v.union(
  v.literal("pm"),
  v.literal("cto"),
  v.literal("dev"),
  v.literal("security"),
  v.literal("architect"),
  v.literal("growth"),
  v.literal("orchestrator"),
  v.literal("system")
);

export const emailDirection = v.union(
  v.literal("inbound"),
  v.literal("outbound")
);

export const emailStatus = v.union(
  v.literal("approved"),
  v.literal("draft"),
  v.literal("pending_review"),
  v.literal("received"),
  v.literal("rejected"),
  v.literal("sent")
);

export const growthItemStatus = v.union(
  v.literal("approved"),
  v.literal("draft"),
  v.literal("pending_review"),
  v.literal("published"),
  v.literal("rejected")
);

export const growthItemType = v.union(
  v.literal("blog_post"),
  v.literal("changelog_announce"),
  v.literal("email_campaign"),
  v.literal("hn_comment"),
  v.literal("linkedin_post"),
  v.literal("reddit_reply"),
  v.literal("twitter_post")
);

export const inboxItemStatus = v.union(
  v.literal("approved"),
  v.literal("auto_approved"),
  v.literal("expired"),
  v.literal("pending"),
  v.literal("rejected"),
  v.literal("snoozed")
);

export const inboxItemType = v.union(
  v.literal("architect_finding"),
  v.literal("ceo_report"),
  v.literal("email_draft"),
  v.literal("email_received"),
  v.literal("growth_post"),
  v.literal("pr_review"),
  v.literal("revenue_alert"),
  v.literal("security_alert"),
  v.literal("task_approval")
);

// ============================================
// AUTOPILOT TABLES
// ============================================

export const autopilotTables = {
  /**
   * Per-org autopilot configuration.
   * Stores which adapter is active, throttle limits, autonomy defaults.
   */
  autopilotConfig: defineTable({
    adapter: codingAdapterType,
    autonomyLevel,
    autoMergePRs: v.boolean(),
    costUsedTodayUsd: v.optional(v.number()),
    createdAt: v.number(),
    dailyCostCapUsd: v.optional(v.number()),
    emailBlocklist: v.optional(v.array(v.string())),
    emailDailyLimit: v.optional(v.number()),
    enabled: v.boolean(),
    maxTasksPerDay: v.number(),
    organizationId: v.id("organizations"),
    orgEmailAddress: v.optional(v.string()),
    requireArchitectReview: v.boolean(),
    tasksResetAt: v.number(),
    tasksUsedToday: v.number(),
    updatedAt: v.number(),
  }).index("by_organization", ["organizationId"]),

  /**
   * Adapter credentials per org.
   * Encrypted at rest by Convex. Stores provider-specific keys.
   */
  autopilotAdapterCredentials: defineTable({
    organizationId: v.id("organizations"),
    adapter: codingAdapterType,
    /**
     * Provider-specific credential fields stored as JSON string.
     * - builtin: { aiGatewayKey?: string, openrouterKey?: string }
     * - copilot: { githubPat: string }
     * - codex: { openaiApiKey: string }
     * - claude_code: { anthropicApiKey: string }
     */
    credentials: v.string(),
    isValid: v.boolean(),
    lastValidatedAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_organization", ["organizationId"])
    .index("by_org_adapter", ["organizationId", "adapter"]),

  /**
   * The core task queue. Every agent interaction produces a task.
   * Tasks form a DAG via parentTaskId and blockedByTaskId.
   */
  autopilotTasks: defineTable({
    organizationId: v.id("organizations"),
    title: v.string(),
    description: v.string(),
    status: autopilotTaskStatus,
    priority: autopilotTaskPriority,
    assignedAgent,
    origin: taskOrigin,
    autonomyLevel,
    parentTaskId: v.optional(v.id("autopilotTasks")),
    blockedByTaskId: v.optional(v.id("autopilotTasks")),
    /**
     * Technical spec produced by the CTO agent.
     * Contains files to modify, changes, acceptance criteria.
     */
    technicalSpec: v.optional(v.string()),
    /**
     * Acceptance criteria as a structured list.
     */
    acceptanceCriteria: v.optional(v.array(v.string())),
    /**
     * GitHub PR URL if a coding run produced one.
     */
    prUrl: v.optional(v.string()),
    prNumber: v.optional(v.number()),
    /**
     * Cost tracking for this task's AI usage.
     */
    tokensUsed: v.optional(v.number()),
    estimatedCostUsd: v.optional(v.number()),
    /**
     * Retry tracking.
     */
    retryCount: v.number(),
    maxRetries: v.number(),
    errorMessage: v.optional(v.string()),
    createdAt: v.number(),
    startedAt: v.optional(v.number()),
    completedAt: v.optional(v.number()),
  })
    .index("by_organization", ["organizationId"])
    .index("by_org_status", ["organizationId", "status"])
    .index("by_org_agent", ["organizationId", "assignedAgent"])
    .index("by_org_priority", ["organizationId", "priority"])
    .index("by_parent", ["parentTaskId"])
    .index("by_blocked_by", ["blockedByTaskId"]),

  /**
   * Tracks individual coding runs — each attempt to modify code.
   * A task may have multiple runs if retries are needed.
   */
  autopilotRuns: defineTable({
    organizationId: v.id("organizations"),
    taskId: v.id("autopilotTasks"),
    adapter: codingAdapterType,
    status: runStatus,
    /**
     * External reference (sandbox ID, Copilot issue number, Codex task ID, etc.)
     */
    externalRef: v.optional(v.string()),
    branch: v.optional(v.string()),
    prUrl: v.optional(v.string()),
    prNumber: v.optional(v.number()),
    /**
     * CI status tracking for the feedback loop.
     */
    ciStatus: v.optional(
      v.union(
        v.literal("pending"),
        v.literal("running"),
        v.literal("passed"),
        v.literal("failed")
      )
    ),
    ciFailureLog: v.optional(v.string()),
    /**
     * Token and cost tracking for this specific run.
     */
    tokensUsed: v.number(),
    estimatedCostUsd: v.number(),
    startedAt: v.number(),
    completedAt: v.optional(v.number()),
    errorMessage: v.optional(v.string()),
  })
    .index("by_task", ["taskId"])
    .index("by_org_status", ["organizationId", "status"])
    .index("by_external_ref", ["externalRef"]),

  /**
   * Real-time activity log for the gamified agent feed.
   * Every agent action writes here so users can follow along.
   */
  autopilotActivityLog: defineTable({
    organizationId: v.id("organizations"),
    taskId: v.optional(v.id("autopilotTasks")),
    runId: v.optional(v.id("autopilotRuns")),
    agent: activityLogAgent,
    level: activityLogLevel,
    message: v.string(),
    /**
     * Optional structured details (e.g., files changed, PR URL).
     */
    details: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_organization", ["organizationId"])
    .index("by_org_created", ["organizationId", "createdAt"])
    .index("by_task", ["taskId"]),

  /**
   * Agent memory storage for context, summaries, and preferences.
   * Allows agents to retain knowledge across runs.
   */
  autopilotAgentMemory: defineTable({
    agent: activityLogAgent,
    content: v.string(),
    createdAt: v.number(),
    memoryType: v.union(
      v.literal("context"),
      v.literal("preference"),
      v.literal("summary")
    ),
    organizationId: v.id("organizations"),
    updatedAt: v.number(),
  }).index("by_org_agent", ["organizationId", "agent"]),

  /**
   * Email management table for drafts, received emails, and email tracking.
   * Supports inbound/outbound email flows with approval workflows.
   */
  autopilotEmails: defineTable({
    bodyHtml: v.string(),
    bodyText: v.string(),
    cc: v.optional(v.array(v.string())),
    createdAt: v.number(),
    direction: emailDirection,
    draftedByAgent: v.optional(activityLogAgent),
    from: v.string(),
    inReplyTo: v.optional(v.id("autopilotEmails")),
    organizationId: v.id("organizations"),
    receivedAt: v.optional(v.number()),
    sentAt: v.optional(v.number()),
    status: emailStatus,
    subject: v.string(),
    threadId: v.optional(v.string()),
    to: v.array(v.string()),
  })
    .index("by_organization", ["organizationId"])
    .index("by_org_direction", ["organizationId", "direction"])
    .index("by_org_status", ["organizationId", "status"])
    .index("by_thread", ["threadId"]),

  /**
   * Growth items table for tracking blog posts, social media content, campaigns.
   * Links to tasks and inbox items for workflow integration.
   */
  autopilotGrowthItems: defineTable({
    content: v.string(),
    createdAt: v.number(),
    organizationId: v.id("organizations"),
    publishedAt: v.optional(v.number()),
    publishedUrl: v.optional(v.string()),
    relatedInboxItemId: v.optional(v.id("autopilotInboxItems")),
    relatedTaskId: v.optional(v.id("autopilotTasks")),
    status: growthItemStatus,
    targetUrl: v.optional(v.string()),
    title: v.string(),
    type: growthItemType,
  })
    .index("by_organization", ["organizationId"])
    .index("by_org_status", ["organizationId", "status"])
    .index("by_org_type", ["organizationId", "type"]),

  /**
   * Inbox items table for aggregating alerts, reviews, and approvals.
   * Central hub for CEO, security, architect, and task reviews.
   */
  autopilotInboxItems: defineTable({
    actionUrl: v.optional(v.string()),
    content: v.optional(v.string()),
    createdAt: v.number(),
    expiresAt: v.optional(v.number()),
    metadata: v.optional(v.string()),
    organizationId: v.id("organizations"),
    priority: autopilotTaskPriority,
    relatedEmailId: v.optional(v.id("autopilotEmails")),
    relatedRunId: v.optional(v.id("autopilotRuns")),
    relatedTaskId: v.optional(v.id("autopilotTasks")),
    reviewedAt: v.optional(v.number()),
    sourceAgent: activityLogAgent,
    status: inboxItemStatus,
    summary: v.string(),
    title: v.string(),
    type: inboxItemType,
  })
    .index("by_organization", ["organizationId"])
    .index("by_org_status", ["organizationId", "status"])
    .index("by_org_type", ["organizationId", "type"])
    .index("by_task", ["relatedTaskId"]),

  /**
   * Revenue snapshots table for tracking MRR, ARR, churn, and subscription metrics.
   * Supports revenue alerts and financial reporting.
   */
  autopilotRevenueSnapshots: defineTable({
    activeSubscriptions: v.number(),
    arr: v.number(),
    cancelledSubscriptions: v.optional(v.number()),
    churnRate: v.optional(v.number()),
    createdAt: v.number(),
    mrr: v.number(),
    newSubscriptions: v.optional(v.number()),
    organizationId: v.id("organizations"),
    snapshotDate: v.string(),
  })
    .index("by_org_date", ["organizationId", "snapshotDate"])
    .index("by_organization", ["organizationId"]),
};
