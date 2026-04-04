import { defineTable } from "convex/server";
import { v } from "convex/values";

// ============================================
// AUTOPILOT VALIDATORS
// ============================================

export const codingAdapterType = v.union(
  v.literal("builtin"),
  v.literal("copilot"),
  v.literal("codex"),
  v.literal("claude_code"),
  v.literal("open_swe"),
  v.literal("openclaw")
);

export const autonomyLevel = v.union(
  v.literal("full_auto"),
  v.literal("review_required"),
  v.literal("manual")
);

/**
 * V6 autonomy mode — the three-mode system for the main toggle.
 * supervised = asks before acting (default)
 * full_auto = autonomous with 15-min delay on external actions
 * stopped = all agent activity paused
 */
export const autonomyMode = v.union(
  v.literal("supervised"),
  v.literal("full_auto"),
  v.literal("stopped")
);

export const autopilotTaskStatus = v.union(
  v.literal("pending"),
  v.literal("in_progress"),
  v.literal("blocked"),
  v.literal("waiting_review"),
  v.literal("paused"),
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
  v.literal("orchestrator"),
  v.literal("support"),
  v.literal("analytics"),
  v.literal("docs"),
  v.literal("qa"),
  v.literal("ops"),
  v.literal("sales")
);

export const taskOrigin = v.union(
  v.literal("pm_analysis"),
  v.literal("security_scan"),
  v.literal("architect_review"),
  v.literal("growth_suggestion"),
  v.literal("user_created"),
  v.literal("cto_breakdown"),
  v.literal("support_escalation"),
  v.literal("analytics_signal"),
  v.literal("qa_regression"),
  v.literal("ops_incident"),
  v.literal("docs_update"),
  v.literal("sales_outreach"),
  v.literal("onboarding")
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
  v.literal("system"),
  v.literal("support"),
  v.literal("analytics"),
  v.literal("docs"),
  v.literal("qa"),
  v.literal("ops"),
  v.literal("sales")
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
  v.literal("task_approval"),
  v.literal("support_reply"),
  v.literal("support_escalation"),
  v.literal("shipped_notification"),
  v.literal("analytics_insight"),
  v.literal("analytics_anomaly"),
  v.literal("analytics_brief"),
  v.literal("docs_update"),
  v.literal("docs_stale"),
  v.literal("qa_test_ready"),
  v.literal("qa_regression"),
  v.literal("ops_deploy_failure"),
  v.literal("ops_error_spike"),
  v.literal("ops_reliability_report"),
  v.literal("ops_rollback"),
  v.literal("sales_lead"),
  v.literal("sales_outreach_draft"),
  v.literal("sales_pipeline_update")
);

// V6 Sales agent validators
export const leadStatus = v.union(
  v.literal("discovered"),
  v.literal("contacted"),
  v.literal("replied"),
  v.literal("demo"),
  v.literal("converted"),
  v.literal("churned"),
  v.literal("disqualified")
);

export const leadSource = v.union(
  v.literal("github_star"),
  v.literal("github_fork"),
  v.literal("product_hunt"),
  v.literal("hackernews"),
  v.literal("reddit"),
  v.literal("web_search"),
  v.literal("referral"),
  v.literal("manual")
);

// V6 Agent thread role
export const agentThreadRole = v.union(v.literal("user"), v.literal("agent"));

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
    ceoChatThreadId: v.optional(v.string()),
    costUsedTodayUsd: v.optional(v.number()),
    createdAt: v.number(),
    dailyCostCapUsd: v.optional(v.number()),
    emailBlocklist: v.optional(v.array(v.string())),
    emailDailyLimit: v.optional(v.number()),
    enabled: v.boolean(),
    intelligenceEnabled: v.optional(v.boolean()),
    pmEnabled: v.optional(v.boolean()),
    ctoEnabled: v.optional(v.boolean()),
    devEnabled: v.optional(v.boolean()),
    securityEnabled: v.optional(v.boolean()),
    architectEnabled: v.optional(v.boolean()),
    growthEnabled: v.optional(v.boolean()),
    supportEnabled: v.optional(v.boolean()),
    analyticsEnabled: v.optional(v.boolean()),
    docsEnabled: v.optional(v.boolean()),
    qaEnabled: v.optional(v.boolean()),
    opsEnabled: v.optional(v.boolean()),
    salesEnabled: v.optional(v.boolean()),
    maxTasksPerDay: v.number(),
    organizationId: v.id("organizations"),
    orgEmailAddress: v.optional(v.string()),
    requireArchitectReview: v.boolean(),
    tasksResetAt: v.number(),
    tasksUsedToday: v.number(),
    updatedAt: v.number(),
    // V6 autonomy mode (main toggle)
    autonomyMode: v.optional(autonomyMode),
    stoppedAt: v.optional(v.number()),
    fullAutoDelay: v.optional(v.number()),
    autoMergeThreshold: v.optional(v.number()),
    // V8 task caps
    maxPendingTasksPerAgent: v.optional(v.number()),
    maxPendingTasksTotal: v.optional(v.number()),
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
     * - open_swe: { langchainApiKey: string }
     * - openclaw: { instanceUrl: string, apiKey: string }
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

  autopilotAnalyticsSnapshots: defineTable({
    organizationId: v.id("organizations"),
    snapshotDate: v.string(),
    activeUsers: v.number(),
    newUsers: v.number(),
    retention7d: v.optional(v.number()),
    retention30d: v.optional(v.number()),
    topFeatures: v.optional(v.string()),
    funnelDropoffs: v.optional(v.string()),
    errorCount: v.optional(v.number()),
    insights: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_organization", ["organizationId"])
    .index("by_org_date", ["organizationId", "snapshotDate"]),

  autopilotOpsSnapshots: defineTable({
    organizationId: v.id("organizations"),
    snapshotDate: v.string(),
    deployCount: v.number(),
    failedDeploys: v.number(),
    avgBuildTime: v.optional(v.number()),
    errorRate: v.optional(v.number()),
    uptimePercent: v.optional(v.number()),
    incidentCount: v.number(),
    createdAt: v.number(),
  })
    .index("by_organization", ["organizationId"])
    .index("by_org_date", ["organizationId", "snapshotDate"]),

  // ============================================
  // V6 TABLES
  // ============================================

  /**
   * Repository analysis results from auto-onboarding.
   * Stores tech stack, maturity, infrastructure findings.
   */
  autopilotRepoAnalysis: defineTable({
    organizationId: v.id("organizations"),
    repoUrl: v.string(),
    techStack: v.optional(v.string()),
    framework: v.optional(v.string()),
    hasCI: v.optional(v.boolean()),
    hasTests: v.optional(v.boolean()),
    hasDocs: v.optional(v.boolean()),
    hasLandingPage: v.optional(v.boolean()),
    hasAnalytics: v.optional(v.boolean()),
    hasMonitoring: v.optional(v.boolean()),
    projectStructure: v.optional(v.string()),
    maturityLevel: v.optional(
      v.union(
        v.literal("new"),
        v.literal("early"),
        v.literal("established"),
        v.literal("mature")
      )
    ),
    findings: v.optional(v.string()),
    createdAt: v.number(),
  }).index("by_organization", ["organizationId"]),

  /**
   * Sales leads managed by the Sales agent.
   * Tracks leads through discovery → outreach → conversion pipeline.
   */
  autopilotLeads: defineTable({
    organizationId: v.id("organizations"),
    name: v.string(),
    email: v.optional(v.string()),
    company: v.optional(v.string()),
    source: leadSource,
    status: leadStatus,
    sourceUrl: v.optional(v.string()),
    notes: v.optional(v.string()),
    lastContactedAt: v.optional(v.number()),
    nextFollowUpAt: v.optional(v.number()),
    convertedAt: v.optional(v.number()),
    outreachCount: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_organization", ["organizationId"])
    .index("by_org_status", ["organizationId", "status"])
    .index("by_org_source", ["organizationId", "source"])
    .index("by_org_follow_up", ["organizationId", "nextFollowUpAt"]),

  /**
   * Per-agent conversational threads.
   * Each agent gets its own chat that users can interact with directly.
   */
  autopilotAgentThreads: defineTable({
    organizationId: v.id("organizations"),
    agent: assignedAgent,
    threadId: v.string(),
    lastMessageAt: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_organization", ["organizationId"])
    .index("by_org_agent", ["organizationId", "agent"]),

  /**
   * Messages within agent threads.
   */
  autopilotAgentMessages: defineTable({
    organizationId: v.id("organizations"),
    threadId: v.id("autopilotAgentThreads"),
    role: agentThreadRole,
    content: v.string(),
    createdAt: v.number(),
  })
    .index("by_thread", ["threadId"])
    .index("by_org_thread", ["organizationId", "threadId"]),

  /**
   * Agent performance metrics — tracks effectiveness over time.
   */
  autopilotAgentMetrics: defineTable({
    organizationId: v.id("organizations"),
    agent: assignedAgent,
    period: v.string(),
    tasksCompleted: v.number(),
    tasksFailed: v.number(),
    avgCompletionTimeMs: v.optional(v.number()),
    approvalRate: v.optional(v.number()),
    tokensUsed: v.optional(v.number()),
    costUsd: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_org_agent", ["organizationId", "agent"])
    .index("by_org_period", ["organizationId", "period"]),

  /**
   * Feedback loop — tracks user approval/rejection of inbox items.
   * Used to adapt agent behavior over time based on user preferences.
   */
  autopilotFeedbackLog: defineTable({
    organizationId: v.id("organizations"),
    inboxItemId: v.id("autopilotInboxItems"),
    agent: activityLogAgent,
    itemType: inboxItemType,
    decision: v.union(v.literal("approved"), v.literal("rejected")),
    rejectionReason: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_organization", ["organizationId"])
    .index("by_org_agent", ["organizationId", "agent"])
    .index("by_inbox_item", ["inboxItemId"]),

  /**
   * Security findings — individual vulnerability/issue entries from security scans.
   */
  autopilotSecurityFindings: defineTable({
    organizationId: v.id("organizations"),
    scanId: v.optional(v.string()),
    severity: v.union(
      v.literal("critical"),
      v.literal("high"),
      v.literal("medium"),
      v.literal("low"),
      v.literal("info")
    ),
    type: v.string(),
    title: v.string(),
    description: v.string(),
    filePath: v.optional(v.string()),
    lineNumber: v.optional(v.number()),
    status: v.union(
      v.literal("open"),
      v.literal("fixing"),
      v.literal("fixed"),
      v.literal("dismissed")
    ),
    fixedAt: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_organization", ["organizationId"])
    .index("by_org_severity", ["organizationId", "severity"])
    .index("by_org_status", ["organizationId", "status"]),

  /**
   * Support conversations — tracks support interactions and Agent responses.
   */
  autopilotSupportConversations: defineTable({
    organizationId: v.id("organizations"),
    userId: v.optional(v.string()),
    userEmail: v.optional(v.string()),
    subject: v.string(),
    status: v.union(
      v.literal("new"),
      v.literal("triaged"),
      v.literal("drafted"),
      v.literal("replied"),
      v.literal("escalated"),
      v.literal("resolved")
    ),
    agentDraftReply: v.optional(v.string()),
    approvedReply: v.optional(v.string()),
    escalatedTo: v.optional(v.string()),
    relatedTaskId: v.optional(v.id("autopilotTasks")),
    messages: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_organization", ["organizationId"])
    .index("by_org_status", ["organizationId", "status"]),
};
