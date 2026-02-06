import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

// Subscription tier and status enums
const subscriptionTier = v.union(v.literal("free"), v.literal("pro"));
const subscriptionStatus = v.union(
  v.literal("active"),
  v.literal("trialing"),
  v.literal("past_due"),
  v.literal("canceled"),
  v.literal("none")
);

// Organization member roles
const memberRole = v.union(
  v.literal("owner"),
  v.literal("admin"),
  v.literal("member")
);

// Invitation status
const invitationStatus = v.union(
  v.literal("pending"),
  v.literal("accepted"),
  v.literal("expired")
);

// Feedback status
const feedbackStatus = v.union(
  v.literal("open"),
  v.literal("under_review"),
  v.literal("planned"),
  v.literal("in_progress"),
  v.literal("completed"),
  v.literal("closed")
);

// Notification types
const notificationType = v.union(
  v.literal("status_change"),
  v.literal("new_comment"),
  v.literal("vote_milestone"),
  v.literal("new_support_message"),
  v.literal("invitation")
);

// Support conversation status
const supportConversationStatus = v.union(
  v.literal("open"),
  v.literal("awaiting_reply"),
  v.literal("resolved"),
  v.literal("closed")
);

// Support message sender type
const supportMessageSenderType = v.union(v.literal("user"), v.literal("admin"));

// Widget position
const widgetPosition = v.union(
  v.literal("bottom-right"),
  v.literal("bottom-left")
);

// GitHub connection status
const githubConnectionStatus = v.union(
  v.literal("connected"),
  v.literal("pending"),
  v.literal("error")
);

// GitHub sync status
const githubSyncStatus = v.union(
  v.literal("idle"),
  v.literal("syncing"),
  v.literal("success"),
  v.literal("error")
);

// Repo analysis status
const repoAnalysisStatus = v.union(
  v.literal("pending"),
  v.literal("in_progress"),
  v.literal("completed"),
  v.literal("error")
);

// Website reference status
const websiteReferenceStatus = v.union(
  v.literal("pending"),
  v.literal("fetching"),
  v.literal("success"),
  v.literal("error")
);

export default defineSchema({
  // ============================================
  // ORGANIZATIONS
  // ============================================
  organizations: defineTable({
    name: v.string(),
    slug: v.string(),
    logo: v.optional(v.string()),
    createdAt: v.number(),
    // Branding
    primaryColor: v.optional(v.string()),
    customCss: v.optional(v.string()),
    isPublic: v.boolean(),
    // Changelog settings
    changelogSettings: v.optional(
      v.object({
        autoVersioning: v.optional(v.boolean()),
        versionIncrement: v.optional(v.string()),
        versionPrefix: v.optional(v.string()),
      })
    ),
    // Subscription (org-based billing)
    subscriptionTier,
    subscriptionStatus,
    stripeCustomerId: v.optional(v.string()), // Stripe customer for this org
    stripeSubscriptionId: v.optional(v.string()), // Active Stripe subscription ID
    // Custom domain (Pro feature)
    customDomain: v.optional(v.string()),
    // Support settings
    supportEnabled: v.optional(v.boolean()),
    // Feedback settings (org-level defaults)
    feedbackSettings: v.optional(
      v.object({
        allowAnonymousVoting: v.optional(v.boolean()),
        defaultTagId: v.optional(v.id("tags")),
        defaultView: v.optional(
          v.union(v.literal("roadmap"), v.literal("feed"))
        ),
        requireApproval: v.optional(v.boolean()),
        defaultStatus: v.optional(feedbackStatus),
      })
    ),
  })
    .index("by_slug", ["slug"])
    .index("by_stripe_customer", ["stripeCustomerId"])
    .searchIndex("search_name", { searchField: "name" }),

  // ============================================
  // ORGANIZATION MEMBERS
  // ============================================
  organizationMembers: defineTable({
    organizationId: v.id("organizations"),
    userId: v.string(), // Better Auth user ID
    role: memberRole,
    createdAt: v.number(),
  })
    .index("by_organization", ["organizationId"])
    .index("by_user", ["userId"])
    .index("by_org_user", ["organizationId", "userId"]),

  // ============================================
  // INVITATIONS
  // ============================================
  invitations: defineTable({
    organizationId: v.id("organizations"),
    email: v.string(),
    role: memberRole,
    status: invitationStatus,
    expiresAt: v.number(),
    createdAt: v.number(),
    inviterId: v.string(), // Better Auth user ID
    token: v.string(), // Unique invitation token
    lastSentAt: v.optional(v.number()), // Timestamp of last email sent
  })
    .index("by_organization", ["organizationId"])
    .index("by_email", ["email"])
    .index("by_token", ["token"])
    .index("by_status", ["status"]),

  // ============================================
  // SUBSCRIPTIONS (Stripe)
  // ============================================
  subscriptions: defineTable({
    organizationId: v.id("organizations"),
    stripeCustomerId: v.string(),
    stripeSubscriptionId: v.string(),
    stripePriceId: v.optional(v.string()),
    status: v.union(
      v.literal("active"),
      v.literal("trialing"),
      v.literal("past_due"),
      v.literal("canceled"),
      v.literal("unpaid"),
      v.literal("incomplete"),
      v.literal("incomplete_expired")
    ),
    currentPeriodStart: v.optional(v.number()),
    currentPeriodEnd: v.optional(v.number()),
    cancelAtPeriodEnd: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_organization", ["organizationId"])
    .index("by_stripe_customer", ["stripeCustomerId"])
    .index("by_stripe_subscription", ["stripeSubscriptionId"]),

  // ============================================
  // ORGANIZATION STATUSES
  // ============================================
  organizationStatuses: defineTable({
    organizationId: v.id("organizations"),
    name: v.string(),
    color: v.string(),
    icon: v.optional(v.string()),
    order: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_organization", ["organizationId"])
    .index("by_org_order", ["organizationId", "order"]),

  // ============================================
  // MILESTONES
  // ============================================
  milestones: defineTable({
    organizationId: v.id("organizations"),
    name: v.string(),
    description: v.optional(v.string()),
    emoji: v.optional(v.string()),
    color: v.string(),
    timeHorizon: v.union(
      v.literal("now"),
      v.literal("next_month"),
      v.literal("next_quarter"),
      v.literal("half_year"),
      v.literal("next_year"),
      v.literal("future")
    ),
    targetDate: v.optional(v.number()),
    order: v.number(),
    status: v.union(
      v.literal("active"),
      v.literal("completed"),
      v.literal("archived")
    ),
    completedAt: v.optional(v.number()),
    isPublic: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_organization", ["organizationId"])
    .index("by_org_status", ["organizationId", "status"])
    .index("by_org_horizon", ["organizationId", "timeHorizon"]),

  // ============================================
  // MILESTONE FEEDBACK (Junction table)
  // ============================================
  milestoneFeedback: defineTable({
    milestoneId: v.id("milestones"),
    feedbackId: v.id("feedback"),
    addedAt: v.number(),
    addedBy: v.optional(v.string()),
  })
    .index("by_milestone", ["milestoneId"])
    .index("by_feedback", ["feedbackId"])
    .index("by_milestone_feedback", ["milestoneId", "feedbackId"]),

  // ============================================
  // TAGS
  // ============================================
  tags: defineTable({
    organizationId: v.id("organizations"),
    name: v.string(),
    slug: v.string(), // URL-friendly identifier
    color: v.string(), // Color name (e.g., "blue", "red") or hex for legacy
    icon: v.optional(v.string()), // Emoji character (e.g., "🔥", "📦")
    description: v.optional(v.string()),
    // Deprecated fields - kept for backward compatibility
    isDoneStatus: v.optional(v.boolean()),
    isRoadmapLane: v.optional(v.boolean()),
    laneOrder: v.optional(v.number()),
    settings: v.optional(
      v.object({
        requireApproval: v.optional(v.boolean()),
        defaultStatus: v.optional(feedbackStatus),
        isPublic: v.optional(v.boolean()),
      })
    ),
    createdAt: v.number(),
    updatedAt: v.optional(v.number()),
  })
    .index("by_organization", ["organizationId"])
    .index("by_org_slug", ["organizationId", "slug"]),

  // ============================================
  // FEEDBACK
  // ============================================
  feedback: defineTable({
    organizationId: v.id("organizations"),
    title: v.string(),
    description: v.string(), // Rich text (Tiptap JSON or markdown)
    status: feedbackStatus,
    organizationStatusId: v.optional(v.id("organizationStatuses")), // Org-level status for roadmap columns
    authorId: v.optional(v.string()), // Better Auth user ID (optional for external users)
    voteCount: v.number(),
    commentCount: v.number(),
    isApproved: v.boolean(),
    isPinned: v.boolean(),
    // Roadmap
    roadmapOrder: v.optional(v.number()),
    completedAt: v.optional(v.number()),
    // GitHub issue sync fields
    githubIssueId: v.optional(v.string()), // Original GitHub issue ID if synced
    githubIssueNumber: v.optional(v.number()), // GitHub issue number (#123)
    githubHtmlUrl: v.optional(v.string()), // Link to GitHub issue
    syncedFromGithub: v.optional(v.boolean()), // Whether this was created from GitHub sync
    // AI clarification fields
    aiClarification: v.optional(v.string()),
    aiClarificationGeneratedAt: v.optional(v.number()),
    // AI draft reply fields
    aiDraftReply: v.optional(v.string()),
    aiDraftReplyGeneratedAt: v.optional(v.number()),
    // AI difficulty estimation fields
    aiDifficultyScore: v.optional(
      v.union(
        v.literal("trivial"),
        v.literal("easy"),
        v.literal("medium"),
        v.literal("hard"),
        v.literal("complex")
      )
    ),
    aiDifficultyReasoning: v.optional(v.string()),
    aiDifficultyGeneratedAt: v.optional(v.number()),
    // External user support (for public API)
    externalUserId: v.optional(v.id("externalUsers")),
    // Assignee (team member assigned to this feedback)
    assigneeId: v.optional(v.string()), // User ID from Better Auth
    // Source tracking
    source: v.optional(
      v.union(v.literal("web"), v.literal("api"), v.literal("widget"))
    ),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_organization", ["organizationId"])
    .index("by_author", ["authorId"])
    .index("by_status", ["status"])
    .index("by_org_status_id", ["organizationStatusId"])
    .index("by_github_issue", ["organizationId", "githubIssueId"])
    .index("by_external_user", ["externalUserId"])
    .index("by_assignee", ["organizationId", "assigneeId"])
    .searchIndex("search_title", {
      searchField: "title",
      filterFields: ["organizationId"],
    }),

  // ============================================
  // FEEDBACK VOTES
  // ============================================
  feedbackVotes: defineTable({
    feedbackId: v.id("feedback"),
    userId: v.optional(v.string()), // Better Auth user ID (optional for external users)
    voteType: v.union(v.literal("upvote"), v.literal("downvote")),
    // External user support (for public API)
    externalUserId: v.optional(v.id("externalUsers")),
    createdAt: v.number(),
  })
    .index("by_feedback", ["feedbackId"])
    .index("by_user", ["userId"])
    .index("by_feedback_user", ["feedbackId", "userId"])
    .index("by_feedback_external_user", ["feedbackId", "externalUserId"]),

  // ============================================
  // FEEDBACK IMPORTANCE VOTES
  // ============================================
  feedbackImportanceVotes: defineTable({
    feedbackId: v.id("feedback"),
    userId: v.string(), // Better Auth user ID
    importance: v.number(), // 1-4 scale: 1=Not important, 2=Nice to have, 3=Important, 4=Essential
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_feedback", ["feedbackId"])
    .index("by_user", ["userId"])
    .index("by_feedback_user", ["feedbackId", "userId"]),

  // ============================================
  // FEEDBACK SUBSCRIPTIONS
  // ============================================
  feedbackSubscriptions: defineTable({
    feedbackId: v.id("feedback"),
    userId: v.optional(v.string()), // Better Auth user ID (optional for external users)
    // External user support (for public API)
    externalUserId: v.optional(v.id("externalUsers")),
    createdAt: v.number(),
  })
    .index("by_feedback", ["feedbackId"])
    .index("by_user", ["userId"])
    .index("by_feedback_user", ["feedbackId", "userId"])
    .index("by_feedback_external_user", ["feedbackId", "externalUserId"]),

  // ============================================
  // FEEDBACK TAGS (Junction table)
  // ============================================
  feedbackTags: defineTable({
    feedbackId: v.id("feedback"),
    tagId: v.id("tags"),
    appliedByAi: v.optional(v.boolean()),
  })
    .index("by_feedback", ["feedbackId"])
    .index("by_tag", ["tagId"])
    .index("by_feedback_tag", ["feedbackId", "tagId"]),

  // ============================================
  // AUTO-TAGGING JOBS (Progress tracking)
  // ============================================
  autoTaggingJobs: defineTable({
    organizationId: v.id("organizations"),
    status: v.union(
      v.literal("pending"),
      v.literal("processing"),
      v.literal("completed"),
      v.literal("failed")
    ),
    totalItems: v.number(),
    processedItems: v.number(),
    successfulItems: v.number(),
    failedItems: v.number(),
    errors: v.array(
      v.object({
        feedbackId: v.id("feedback"),
        error: v.string(),
      })
    ),
    startedAt: v.number(),
    completedAt: v.optional(v.number()),
  }).index("by_organization", ["organizationId"]),

  // ============================================
  // COMMENTS
  // ============================================
  comments: defineTable({
    feedbackId: v.id("feedback"),
    authorId: v.optional(v.string()), // Better Auth user ID (optional for external users)
    body: v.string(), // Rich text (Tiptap JSON or markdown)
    isOfficial: v.boolean(), // Admin marked as official response
    parentId: v.optional(v.id("comments")), // For threaded replies
    // External user support (for public API)
    externalUserId: v.optional(v.id("externalUsers")),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_feedback", ["feedbackId"])
    .index("by_author", ["authorId"])
    .index("by_parent", ["parentId"])
    .index("by_external_user", ["externalUserId"]),

  // ============================================
  // RELEASES (Changelog)
  // ============================================
  releases: defineTable({
    organizationId: v.id("organizations"),
    title: v.string(),
    description: v.optional(v.string()), // Rich text
    version: v.optional(v.string()), // e.g., "v1.2.0"
    publishedAt: v.optional(v.number()), // null = draft
    // GitHub sync fields
    githubReleaseId: v.optional(v.string()), // Original GitHub release ID if synced
    githubHtmlUrl: v.optional(v.string()), // Link to GitHub release
    syncedFromGithub: v.optional(v.boolean()), // Whether this was created from GitHub sync
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_organization", ["organizationId"])
    .index("by_published", ["organizationId", "publishedAt"])
    .index("by_github_release", ["organizationId", "githubReleaseId"]),

  // ============================================
  // RELEASE FEEDBACK (Junction table)
  // ============================================
  releaseFeedback: defineTable({
    releaseId: v.id("releases"),
    feedbackId: v.id("feedback"),
    createdAt: v.number(),
  })
    .index("by_release", ["releaseId"])
    .index("by_feedback", ["feedbackId"])
    .index("by_release_feedback", ["releaseId", "feedbackId"]),

  // ============================================
  // CHANGELOG SUBSCRIBERS
  // ============================================
  changelogSubscribers: defineTable({
    userId: v.optional(v.string()), // Better Auth user ID (optional for email-only)
    email: v.optional(v.string()), // Email for anonymous subscribers
    organizationId: v.id("organizations"),
    subscribedAt: v.number(),
    unsubscribeToken: v.string(), // Unique token for one-click unsubscribe
  })
    .index("by_user", ["userId"])
    .index("by_organization", ["organizationId"])
    .index("by_user_org", ["userId", "organizationId"])
    .index("by_email_org", ["email", "organizationId"])
    .index("by_unsubscribe_token", ["unsubscribeToken"]),

  // ============================================
  // NOTIFICATIONS
  // ============================================
  notifications: defineTable({
    userId: v.string(), // Better Auth user ID
    type: notificationType,
    title: v.string(),
    message: v.string(),
    feedbackId: v.optional(v.id("feedback")),
    invitationToken: v.optional(v.string()), // Token for invitation notifications
    isRead: v.boolean(),
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_read", ["userId", "isRead"]),

  // ============================================
  // ACTIVITY LOGS
  // ============================================
  activityLogs: defineTable({
    organizationId: v.id("organizations"),
    feedbackId: v.optional(v.id("feedback")),
    authorId: v.string(), // Better Auth user ID
    action: v.string(), // e.g., "created", "status_changed", "commented"
    details: v.optional(v.string()), // JSON string with additional data
    createdAt: v.number(),
  })
    .index("by_organization", ["organizationId"])
    .index("by_feedback", ["feedbackId"]),

  // ============================================
  // LEGACY: TODOS (keeping for now)
  // ============================================
  todos: defineTable({
    text: v.string(),
    completed: v.boolean(),
  }),

  // ============================================
  // SUPPORT CONVERSATIONS (Inbox)
  // ============================================
  supportConversations: defineTable({
    organizationId: v.id("organizations"),
    userId: v.string(),
    subject: v.optional(v.string()),
    status: supportConversationStatus,
    assignedTo: v.optional(v.string()),
    lastMessageAt: v.number(),
    userUnreadCount: v.number(),
    adminUnreadCount: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_organization", ["organizationId"])
    .index("by_user", ["userId"])
    .index("by_org_user", ["organizationId", "userId"])
    .index("by_org_status", ["organizationId", "status"])
    .index("by_assigned", ["assignedTo"]),

  // ============================================
  // SUPPORT MESSAGES
  // ============================================
  supportMessages: defineTable({
    conversationId: v.id("supportConversations"),
    senderId: v.string(),
    senderType: supportMessageSenderType,
    body: v.string(),
    isRead: v.boolean(),
    createdAt: v.number(),
  })
    .index("by_conversation", ["conversationId"])
    .index("by_conversation_created", ["conversationId", "createdAt"]),

  // ============================================
  // MESSAGE REACTIONS
  // ============================================
  messageReactions: defineTable({
    messageId: v.id("supportMessages"),
    userId: v.string(),
    emoji: v.string(),
    createdAt: v.number(),
  })
    .index("by_message", ["messageId"])
    .index("by_user", ["userId"])
    .index("by_message_user", ["messageId", "userId"]),

  // ============================================
  // EMBEDDABLE CHAT WIDGETS
  // ============================================
  widgets: defineTable({
    organizationId: v.id("organizations"),
    widgetId: v.string(),
    name: v.string(),
    isActive: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_widget_id", ["widgetId"])
    .index("by_organization", ["organizationId"]),

  widgetSettings: defineTable({
    widgetId: v.id("widgets"),
    primaryColor: v.string(),
    position: widgetPosition,
    welcomeMessage: v.string(),
    greetingMessage: v.optional(v.string()),
    showLauncher: v.boolean(),
    autoOpen: v.boolean(),
    zIndex: v.number(),
  }).index("by_widget", ["widgetId"]),

  widgetConversations: defineTable({
    widgetId: v.id("widgets"),
    conversationId: v.id("supportConversations"),
    visitorId: v.string(),
    metadata: v.optional(
      v.object({
        userAgent: v.optional(v.string()),
        url: v.optional(v.string()),
        referrer: v.optional(v.string()),
      })
    ),
    lastSeenAt: v.number(),
    createdAt: v.number(),
  })
    .index("by_widget_visitor", ["widgetId", "visitorId"])
    .index("by_conversation", ["conversationId"]),

  // ============================================
  // GITHUB CONNECTIONS
  // ============================================
  githubConnections: defineTable({
    organizationId: v.id("organizations"),
    // GitHub App installation details
    installationId: v.string(), // GitHub App installation ID
    accountType: v.union(v.literal("user"), v.literal("organization")),
    accountLogin: v.string(), // GitHub username or org name
    accountAvatarUrl: v.optional(v.string()),
    // Connection status
    status: githubConnectionStatus,
    // Connected repository (optional - can connect later)
    repositoryId: v.optional(v.string()), // GitHub repo ID
    repositoryFullName: v.optional(v.string()), // e.g., "owner/repo"
    repositoryDefaultBranch: v.optional(v.string()),
    // Webhook configuration
    webhookId: v.optional(v.string()),
    webhookSecret: v.optional(v.string()),
    // CI/GitHub Action configuration
    ciEnabled: v.optional(v.boolean()),
    ciBranch: v.optional(v.string()), // Branch to watch for releases
    ciWorkflowCreated: v.optional(v.boolean()),
    // Release sync settings
    autoSyncReleases: v.optional(v.boolean()),
    lastSyncAt: v.optional(v.number()),
    lastSyncStatus: v.optional(githubSyncStatus),
    lastSyncError: v.optional(v.string()),
    // Issue sync settings
    autoSyncIssues: v.optional(v.boolean()),
    issuesSyncEnabled: v.optional(v.boolean()),
    lastIssuesSyncAt: v.optional(v.number()),
    lastIssuesSyncStatus: v.optional(githubSyncStatus),
    lastIssuesSyncError: v.optional(v.string()),
    // Timestamps
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_organization", ["organizationId"])
    .index("by_installation", ["installationId"]),

  // ============================================
  // GITHUB RELEASES (Synced from GitHub)
  // ============================================
  githubReleases: defineTable({
    organizationId: v.id("organizations"),
    githubConnectionId: v.id("githubConnections"),
    // GitHub release data
    githubReleaseId: v.string(), // GitHub's release ID
    tagName: v.string(),
    name: v.optional(v.string()),
    body: v.optional(v.string()), // Release notes markdown
    htmlUrl: v.string(),
    isDraft: v.boolean(),
    isPrerelease: v.boolean(),
    publishedAt: v.optional(v.number()),
    createdAt: v.number(),
    // Link to Reflet release (if imported)
    refletReleaseId: v.optional(v.id("releases")),
    // Sync metadata
    lastSyncedAt: v.number(),
  })
    .index("by_organization", ["organizationId"])
    .index("by_connection", ["githubConnectionId"])
    .index("by_github_release_id", ["githubConnectionId", "githubReleaseId"]),

  // ============================================
  // GITHUB WEBHOOK EVENTS (for debugging/audit)
  // ============================================
  githubWebhookEvents: defineTable({
    organizationId: v.id("organizations"),
    githubConnectionId: v.id("githubConnections"),
    eventType: v.string(), // e.g., "release", "push", "issues"
    action: v.optional(v.string()), // e.g., "published", "created", "opened"
    payload: v.string(), // JSON stringified payload (truncated)
    processedAt: v.optional(v.number()),
    error: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_connection", ["githubConnectionId"])
    .index("by_organization", ["organizationId"]),

  // ============================================
  // GITHUB LABEL MAPPINGS (Maps GitHub labels to Reflet tags)
  // ============================================
  githubLabelMappings: defineTable({
    organizationId: v.id("organizations"),
    githubConnectionId: v.id("githubConnections"),
    // GitHub label info
    githubLabelName: v.string(), // The GitHub label name to match
    githubLabelColor: v.optional(v.string()), // Label color from GitHub
    // Mapping target
    targetTagId: v.optional(v.id("tags")), // Tag to apply to synced feedback
    // Sync options
    autoSync: v.boolean(), // Whether to auto-sync issues with this label
    syncClosedIssues: v.optional(v.boolean()), // Whether to sync closed issues
    defaultStatus: v.optional(feedbackStatus), // Default status for synced issues
    // Timestamps
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_organization", ["organizationId"])
    .index("by_connection", ["githubConnectionId"])
    .index("by_connection_label", ["githubConnectionId", "githubLabelName"]),

  // ============================================
  // GITHUB ISSUES (Synced from GitHub)
  // ============================================
  githubIssues: defineTable({
    organizationId: v.id("organizations"),
    githubConnectionId: v.id("githubConnections"),
    // GitHub issue data
    githubIssueId: v.string(), // GitHub's issue ID
    githubIssueNumber: v.number(), // Issue number (#123)
    title: v.string(),
    body: v.optional(v.string()), // Issue body markdown
    htmlUrl: v.string(),
    state: v.union(v.literal("open"), v.literal("closed")),
    // GitHub metadata
    githubLabels: v.array(v.string()), // Array of label names
    githubAuthor: v.optional(v.string()), // GitHub username
    githubAuthorAvatarUrl: v.optional(v.string()),
    githubMilestone: v.optional(v.string()),
    githubAssignees: v.optional(v.array(v.string())), // Array of usernames
    // Timestamps from GitHub
    githubCreatedAt: v.number(),
    githubUpdatedAt: v.number(),
    githubClosedAt: v.optional(v.number()),
    // Link to Reflet feedback (if imported)
    refletFeedbackId: v.optional(v.id("feedback")),
    // Sync metadata
    lastSyncedAt: v.number(),
  })
    .index("by_organization", ["organizationId"])
    .index("by_connection", ["githubConnectionId"])
    .index("by_github_issue_id", ["githubConnectionId", "githubIssueId"])
    .index("by_github_issue_number", [
      "githubConnectionId",
      "githubIssueNumber",
    ])
    .index("by_reflet_feedback", ["refletFeedbackId"]),

  // ============================================
  // REPO ANALYSIS (AI-powered repository analysis)
  // ============================================
  repoAnalysis: defineTable({
    organizationId: v.id("organizations"),
    githubConnectionId: v.id("githubConnections"),
    status: repoAnalysisStatus,
    summary: v.optional(v.string()),
    techStack: v.optional(v.string()),
    architecture: v.optional(v.string()),
    features: v.optional(v.string()),
    repoStructure: v.optional(v.string()),
    error: v.optional(v.string()),
    threadId: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
    completedAt: v.optional(v.number()),
  }).index("by_organization", ["organizationId"]),

  // ============================================
  // WEBSITE REFERENCES (AI context from websites)
  // ============================================
  websiteReferences: defineTable({
    organizationId: v.id("organizations"),
    url: v.string(),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    scrapedContent: v.optional(v.string()),
    status: websiteReferenceStatus,
    errorMessage: v.optional(v.string()),
    lastFetchedAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_organization", ["organizationId"]),

  // ============================================
  // ORGANIZATION API KEYS
  // ============================================
  organizationApiKeys: defineTable({
    organizationId: v.id("organizations"),
    tagId: v.optional(v.id("tags")), // Optional: scope key to specific tag
    name: v.string(), // User-friendly name for the key
    publicKey: v.string(), // fb_pub_xxxxxxxxxxxx
    secretKeyHash: v.string(), // Hashed secret key
    allowedDomains: v.optional(v.array(v.string())), // Optional CORS restriction
    isActive: v.boolean(),
    rateLimit: v.optional(
      v.object({
        requestsPerMinute: v.number(),
      })
    ),
    createdAt: v.number(),
    lastUsedAt: v.optional(v.number()),
  })
    .index("by_organization", ["organizationId"])
    .index("by_public_key", ["publicKey"])
    .index("by_org_tag", ["organizationId", "tagId"]),

  // ============================================
  // EXTERNAL USERS (Users from client apps via API)
  // ============================================
  externalUsers: defineTable({
    organizationId: v.id("organizations"),
    externalId: v.string(), // User's ID in client's system
    email: v.optional(v.string()),
    name: v.optional(v.string()),
    avatar: v.optional(v.string()),
    metadata: v.optional(v.any()), // Custom data from client
    createdAt: v.number(),
    lastSeenAt: v.number(),
  })
    .index("by_organization_external", ["organizationId", "externalId"])
    .index("by_organization_email", ["organizationId", "email"]),

  // ============================================
  // FEEDBACK VISITORS (Anonymous visitors from widget/API)
  // ============================================
  feedbackVisitors: defineTable({
    organizationId: v.id("organizations"),
    visitorId: v.string(),
    metadata: v.optional(
      v.object({
        userAgent: v.optional(v.string()),
        url: v.optional(v.string()),
      })
    ),
    createdAt: v.number(),
    lastSeenAt: v.number(),
  }).index("by_organization_visitor", ["organizationId", "visitorId"]),

  // ============================================
  // API REQUEST LOGS (For rate limiting & analytics)
  // ============================================
  apiRequestLogs: defineTable({
    organizationId: v.id("organizations"),
    organizationApiKeyId: v.optional(v.id("organizationApiKeys")),
    endpoint: v.string(),
    method: v.string(),
    statusCode: v.number(),
    ip: v.optional(v.string()),
    userAgent: v.optional(v.string()),
    timestamp: v.number(),
  })
    .index("by_organization_time", ["organizationId", "timestamp"])
    .index("by_org_key_time", ["organizationApiKeyId", "timestamp"]),
});
