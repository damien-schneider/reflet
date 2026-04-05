import { defineTable } from "convex/server";
import { v } from "convex/values";
import {
  feedbackStatus,
  githubConnectionStatus,
  githubSyncStatus,
  repoAnalysisStatus,
  websiteReferenceStatus,
} from "../../shared/validators";

export const githubTables = {
  userGithubConnections: defineTable({
    userId: v.string(),
    installationId: v.string(),
    accountType: v.union(v.literal("user"), v.literal("organization")),
    accountLogin: v.string(),
    accountAvatarUrl: v.optional(v.string()),
    status: githubConnectionStatus,
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_installation", ["installationId"]),

  githubConnections: defineTable({
    organizationId: v.id("organizations"),
    installationId: v.string(),
    accountType: v.union(v.literal("user"), v.literal("organization")),
    accountLogin: v.string(),
    accountAvatarUrl: v.optional(v.string()),
    linkedByUserId: v.optional(v.string()),
    status: githubConnectionStatus,
    repositoryId: v.optional(v.string()),
    repositoryFullName: v.optional(v.string()),
    repositoryDefaultBranch: v.optional(v.string()),
    webhookId: v.optional(v.string()),
    webhookSecret: v.optional(v.string()),
    ciEnabled: v.optional(v.boolean()),
    ciBranch: v.optional(v.string()),
    ciWorkflowCreated: v.optional(v.boolean()),
    autoSyncReleases: v.optional(v.boolean()),
    lastSyncAt: v.optional(v.number()),
    lastSyncStatus: v.optional(githubSyncStatus),
    lastSyncError: v.optional(v.string()),
    autoSyncIssues: v.optional(v.boolean()),
    issuesSyncEnabled: v.optional(v.boolean()),
    lastIssuesSyncAt: v.optional(v.number()),
    lastIssuesSyncStatus: v.optional(githubSyncStatus),
    lastIssuesSyncError: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_organization", ["organizationId"])
    .index("by_installation", ["installationId"]),

  githubReleases: defineTable({
    organizationId: v.id("organizations"),
    githubConnectionId: v.id("githubConnections"),
    githubReleaseId: v.string(),
    tagName: v.string(),
    name: v.optional(v.string()),
    body: v.optional(v.string()),
    htmlUrl: v.string(),
    isDraft: v.boolean(),
    isPrerelease: v.boolean(),
    publishedAt: v.optional(v.number()),
    createdAt: v.number(),
    refletReleaseId: v.optional(v.id("releases")),
    lastSyncedAt: v.number(),
  })
    .index("by_organization", ["organizationId"])
    .index("by_connection", ["githubConnectionId"])
    .index("by_github_release_id", ["githubConnectionId", "githubReleaseId"]),

  githubWebhookEvents: defineTable({
    organizationId: v.id("organizations"),
    githubConnectionId: v.id("githubConnections"),
    eventType: v.string(),
    action: v.optional(v.string()),
    payload: v.string(),
    processedAt: v.optional(v.number()),
    error: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_connection", ["githubConnectionId"])
    .index("by_organization", ["organizationId"]),

  githubLabelMappings: defineTable({
    organizationId: v.id("organizations"),
    githubConnectionId: v.id("githubConnections"),
    githubLabelName: v.string(),
    githubLabelColor: v.optional(v.string()),
    targetTagId: v.optional(v.id("tags")),
    autoSync: v.boolean(),
    syncClosedIssues: v.optional(v.boolean()),
    defaultStatus: v.optional(feedbackStatus),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_organization", ["organizationId"])
    .index("by_connection", ["githubConnectionId"])
    .index("by_connection_label", ["githubConnectionId", "githubLabelName"]),

  githubIssues: defineTable({
    organizationId: v.id("organizations"),
    githubConnectionId: v.id("githubConnections"),
    githubIssueId: v.string(),
    githubIssueNumber: v.number(),
    title: v.string(),
    body: v.optional(v.string()),
    htmlUrl: v.string(),
    state: v.union(v.literal("open"), v.literal("closed")),
    githubLabels: v.array(v.string()),
    githubAuthor: v.optional(v.string()),
    githubAuthorAvatarUrl: v.optional(v.string()),
    githubMilestone: v.optional(v.string()),
    githubAssignees: v.optional(v.array(v.string())),
    githubCreatedAt: v.number(),
    githubUpdatedAt: v.number(),
    githubClosedAt: v.optional(v.number()),
    refletFeedbackId: v.optional(v.id("feedback")),
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

  repoAnalysis: defineTable({
    organizationId: v.id("organizations"),
    githubConnectionId: v.id("githubConnections"),
    status: repoAnalysisStatus,
    summary: v.optional(v.string()),
    techStack: v.optional(v.string()),
    architecture: v.optional(v.string()),
    features: v.optional(v.string()),
    repoStructure: v.optional(v.string()),
    productAnalysis: v.optional(v.string()),
    error: v.optional(v.string()),
    threadId: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
    completedAt: v.optional(v.number()),
  }).index("by_organization", ["organizationId"]),

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

  projectSetupResults: defineTable({
    organizationId: v.id("organizations"),
    githubConnectionId: v.id("githubConnections"),
    status: v.union(
      v.literal("idle"),
      v.literal("analyzing"),
      v.literal("review"),
      v.literal("completed"),
      v.literal("error")
    ),
    steps: v.array(
      v.object({
        key: v.string(),
        label: v.string(),
        status: v.union(
          v.literal("pending"),
          v.literal("running"),
          v.literal("done"),
          v.literal("error")
        ),
        summary: v.optional(v.string()),
        error: v.optional(v.string()),
      })
    ),
    suggestedMonitors: v.optional(
      v.array(
        v.object({
          url: v.string(),
          name: v.string(),
          method: v.optional(v.string()),
          accepted: v.boolean(),
        })
      )
    ),
    suggestedKeywords: v.optional(
      v.array(
        v.object({
          keyword: v.string(),
          category: v.string(),
          accepted: v.boolean(),
        })
      )
    ),
    suggestedTags: v.optional(
      v.array(
        v.object({
          name: v.string(),
          color: v.string(),
          accepted: v.boolean(),
        })
      )
    ),
    changelogConfig: v.optional(
      v.object({
        workflow: v.union(
          v.literal("ai_powered"),
          v.literal("automated"),
          v.literal("manual")
        ),
        importExisting: v.boolean(),
        syncDirection: v.string(),
        versionPrefix: v.string(),
        targetBranch: v.string(),
        releaseCount: v.optional(v.number()),
        hasConventionalCommits: v.optional(v.boolean()),
      })
    ),
    suggestedPrompts: v.optional(
      v.array(
        v.object({
          title: v.string(),
          prompt: v.string(),
        })
      )
    ),
    projectOverview: v.optional(v.string()),
    error: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
    completedAt: v.optional(v.number()),
  }).index("by_organization", ["organizationId"]),
};
