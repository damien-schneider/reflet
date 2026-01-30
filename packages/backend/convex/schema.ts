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
    // Subscription
    subscriptionTier,
    subscriptionStatus,
    subscriptionId: v.optional(v.string()),
    // Support settings
    supportEnabled: v.optional(v.boolean()),
  })
    .index("by_slug", ["slug"])
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
  // SUBSCRIPTIONS (Polar)
  // ============================================
  subscriptions: defineTable({
    organizationId: v.id("organizations"),
    polarCustomerId: v.string(),
    polarProductId: v.string(),
    polarProductName: v.optional(v.string()),
    status: v.union(
      v.literal("active"),
      v.literal("trialing"),
      v.literal("past_due"),
      v.literal("canceled"),
      v.literal("unpaid")
    ),
    currentPeriodStart: v.optional(v.number()),
    currentPeriodEnd: v.optional(v.number()),
    cancelAtPeriodEnd: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_organization", ["organizationId"])
    .index("by_polar_customer", ["polarCustomerId"]),

  // ============================================
  // BOARDS
  // ============================================
  boards: defineTable({
    organizationId: v.id("organizations"),
    name: v.string(),
    slug: v.string(),
    description: v.optional(v.string()),
    isPublic: v.boolean(),
    defaultView: v.optional(v.union(v.literal("roadmap"), v.literal("feed"))),
    settings: v.optional(
      v.object({
        allowAnonymousVoting: v.optional(v.boolean()),
        requireApproval: v.optional(v.boolean()),
        defaultStatus: v.optional(feedbackStatus),
      })
    ),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_organization", ["organizationId"])
    .index("by_org_slug", ["organizationId", "slug"]),

  // ============================================
  // BOARD STATUSES
  // ============================================
  boardStatuses: defineTable({
    boardId: v.id("boards"),
    name: v.string(),
    color: v.string(),
    icon: v.optional(v.string()),
    order: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_board", ["boardId"])
    .index("by_board_order", ["boardId", "order"]),

  // ============================================
  // TAGS
  // ============================================
  tags: defineTable({
    organizationId: v.id("organizations"),
    name: v.string(),
    color: v.string(), // Hex color
    isDoneStatus: v.boolean(), // Marks completion for changelog
    isRoadmapLane: v.boolean(), // Can be used as roadmap lane
    laneOrder: v.optional(v.number()), // Order in roadmap lanes
    createdAt: v.number(),
  }).index("by_organization", ["organizationId"]),

  // ============================================
  // FEEDBACK
  // ============================================
  feedback: defineTable({
    boardId: v.id("boards"),
    organizationId: v.id("organizations"), // Denormalized for easier queries
    title: v.string(),
    description: v.string(), // Rich text (Tiptap JSON or markdown)
    status: feedbackStatus,
    statusId: v.optional(v.id("boardStatuses")),
    authorId: v.optional(v.string()), // Better Auth user ID (optional for external users)
    voteCount: v.number(),
    commentCount: v.number(),
    isApproved: v.boolean(),
    isPinned: v.boolean(),
    // Roadmap
    roadmapLane: v.optional(v.string()), // Tag ID or "now"/"next"/"later"
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
    // External user support (for public API)
    externalUserId: v.optional(v.id("externalUsers")),
    // Source tracking
    source: v.optional(
      v.union(v.literal("web"), v.literal("api"), v.literal("widget"))
    ),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_board", ["boardId"])
    .index("by_organization", ["organizationId"])
    .index("by_author", ["authorId"])
    .index("by_status", ["status"])
    .index("by_board_status", ["boardId", "status"])
    .index("by_status_id", ["statusId"])
    .index("by_github_issue", ["organizationId", "githubIssueId"])
    .index("by_external_user", ["externalUserId"])
    .searchIndex("search_title", {
      searchField: "title",
      filterFields: ["boardId", "organizationId"],
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
  })
    .index("by_feedback", ["feedbackId"])
    .index("by_tag", ["tagId"])
    .index("by_feedback_tag", ["feedbackId", "tagId"]),

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
  })
    .index("by_user", ["userId"])
    .index("by_organization", ["organizationId"])
    .index("by_user_org", ["userId", "organizationId"])
    .index("by_email_org", ["email", "organizationId"]),

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
  // GITHUB LABEL MAPPINGS (Maps GitHub labels to Reflet boards/tags)
  // ============================================
  githubLabelMappings: defineTable({
    organizationId: v.id("organizations"),
    githubConnectionId: v.id("githubConnections"),
    // GitHub label info
    githubLabelName: v.string(), // The GitHub label name to match
    githubLabelColor: v.optional(v.string()), // Label color from GitHub
    // Mapping target
    targetBoardId: v.optional(v.id("boards")), // Board to sync issues to
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
  // BOARD API KEYS (For public API access)
  // ============================================
  boardApiKeys: defineTable({
    boardId: v.id("boards"),
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
    .index("by_board", ["boardId"])
    .index("by_public_key", ["publicKey"]),

  // ============================================
  // EXTERNAL USERS (Users from client apps via API)
  // ============================================
  externalUsers: defineTable({
    boardId: v.id("boards"),
    externalId: v.string(), // User's ID in client's system
    email: v.optional(v.string()),
    name: v.optional(v.string()),
    avatar: v.optional(v.string()),
    metadata: v.optional(v.any()), // Custom data from client
    createdAt: v.number(),
    lastSeenAt: v.number(),
  })
    .index("by_board_external", ["boardId", "externalId"])
    .index("by_board_email", ["boardId", "email"]),

  // ============================================
  // FEEDBACK VISITORS (Anonymous visitors from widget/API)
  // ============================================
  feedbackVisitors: defineTable({
    boardId: v.id("boards"),
    visitorId: v.string(),
    metadata: v.optional(
      v.object({
        userAgent: v.optional(v.string()),
        url: v.optional(v.string()),
      })
    ),
    createdAt: v.number(),
    lastSeenAt: v.number(),
  }).index("by_board_visitor", ["boardId", "visitorId"]),

  // ============================================
  // API REQUEST LOGS (For rate limiting & analytics)
  // ============================================
  apiRequestLogs: defineTable({
    boardId: v.id("boards"),
    apiKeyId: v.id("boardApiKeys"),
    endpoint: v.string(),
    method: v.string(),
    statusCode: v.number(),
    ip: v.optional(v.string()),
    userAgent: v.optional(v.string()),
    timestamp: v.number(),
  }).index("by_key_time", ["apiKeyId", "timestamp"]),
});
