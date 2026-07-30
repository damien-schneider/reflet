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
  githubConnections: defineTable({
    accountAvatarUrl: v.optional(v.string()),
    accountLogin: v.string(),
    accountType: v.union(v.literal("user"), v.literal("organization")),
    autoSyncIssues: v.optional(v.boolean()),
    autoSyncReleases: v.optional(v.boolean()),
    ciBranch: v.optional(v.string()),
    ciEnabled: v.optional(v.boolean()),
    ciWorkflowCreated: v.optional(v.boolean()),
    createdAt: v.number(),
    installationId: v.string(),
    issuesSyncEnabled: v.optional(v.boolean()),
    lastIssuesSyncAt: v.optional(v.number()),
    lastIssuesSyncError: v.optional(v.string()),
    lastIssuesSyncStatus: v.optional(githubSyncStatus),
    lastSyncAt: v.optional(v.number()),
    lastSyncError: v.optional(v.string()),
    lastSyncStatus: v.optional(githubSyncStatus),
    linkedByUserId: v.optional(v.string()),
    organizationId: v.id("organizations"),
    repositoryDefaultBranch: v.optional(v.string()),
    repositoryFullName: v.optional(v.string()),
    repositoryId: v.optional(v.string()),
    status: githubConnectionStatus,
    updatedAt: v.number(),
    webhookId: v.optional(v.string()),
    webhookSecret: v.optional(v.string()),
  })
    .index("by_organization", ["organizationId"])
    .index("by_installation", ["installationId"]),

  githubIssues: defineTable({
    body: v.optional(v.string()),
    githubAssignees: v.optional(v.array(v.string())),
    githubAuthor: v.optional(v.string()),
    githubAuthorAvatarUrl: v.optional(v.string()),
    githubClosedAt: v.optional(v.number()),
    githubConnectionId: v.id("githubConnections"),
    githubCreatedAt: v.number(),
    githubIssueId: v.string(),
    githubIssueNumber: v.number(),
    githubLabels: v.array(v.string()),
    githubMilestone: v.optional(v.string()),
    githubUpdatedAt: v.number(),
    htmlUrl: v.string(),
    lastSyncedAt: v.number(),
    organizationId: v.id("organizations"),
    refletFeedbackId: v.optional(v.id("feedback")),
    state: v.union(v.literal("open"), v.literal("closed")),
    title: v.string(),
  })
    .index("by_organization", ["organizationId"])
    .index("by_connection", ["githubConnectionId"])
    .index("by_github_issue_id", ["githubConnectionId", "githubIssueId"])
    .index("by_github_issue_number", [
      "githubConnectionId",
      "githubIssueNumber",
    ])
    .index("by_reflet_feedback", ["refletFeedbackId"]),

  githubLabelMappings: defineTable({
    autoSync: v.boolean(),
    createdAt: v.number(),
    defaultStatus: v.optional(feedbackStatus),
    githubConnectionId: v.id("githubConnections"),
    githubLabelColor: v.optional(v.string()),
    githubLabelName: v.string(),
    organizationId: v.id("organizations"),
    syncClosedIssues: v.optional(v.boolean()),
    targetTagId: v.optional(v.id("tags")),
    updatedAt: v.number(),
  })
    .index("by_organization", ["organizationId"])
    .index("by_connection", ["githubConnectionId"])
    .index("by_connection_label", ["githubConnectionId", "githubLabelName"]),

  githubReleases: defineTable({
    body: v.optional(v.string()),
    createdAt: v.number(),
    githubConnectionId: v.id("githubConnections"),
    githubReleaseId: v.string(),
    htmlUrl: v.string(),
    isDraft: v.boolean(),
    isPrerelease: v.boolean(),
    lastSyncedAt: v.number(),
    name: v.optional(v.string()),
    organizationId: v.id("organizations"),
    publishedAt: v.optional(v.number()),
    refletReleaseId: v.optional(v.id("releases")),
    tagName: v.string(),
  })
    .index("by_organization", ["organizationId"])
    .index("by_connection", ["githubConnectionId"])
    .index("by_github_release_id", ["githubConnectionId", "githubReleaseId"]),

  githubWebhookEvents: defineTable({
    action: v.optional(v.string()),
    createdAt: v.number(),
    error: v.optional(v.string()),
    eventType: v.string(),
    githubConnectionId: v.id("githubConnections"),
    organizationId: v.id("organizations"),
    payload: v.string(),
    processedAt: v.optional(v.number()),
  })
    .index("by_connection", ["githubConnectionId"])
    .index("by_organization", ["organizationId"]),

  projectSetupResults: defineTable({
    changelogConfig: v.optional(
      v.object({
        hasConventionalCommits: v.optional(v.boolean()),
        importExisting: v.boolean(),
        releaseCount: v.optional(v.number()),
        syncDirection: v.string(),
        targetBranch: v.string(),
        versionPrefix: v.string(),
        workflow: v.union(
          v.literal("ai_powered"),
          v.literal("automated"),
          v.literal("manual")
        ),
      })
    ),
    completedAt: v.optional(v.number()),
    createdAt: v.number(),
    error: v.optional(v.string()),
    githubConnectionId: v.id("githubConnections"),
    organizationId: v.id("organizations"),
    projectOverview: v.optional(v.string()),
    status: v.union(
      v.literal("idle"),
      v.literal("analyzing"),
      v.literal("review"),
      v.literal("completed"),
      v.literal("error")
    ),
    steps: v.array(
      v.object({
        error: v.optional(v.string()),
        key: v.string(),
        label: v.string(),
        status: v.union(
          v.literal("pending"),
          v.literal("running"),
          v.literal("done"),
          v.literal("error")
        ),
        summary: v.optional(v.string()),
      })
    ),
    suggestedKeywords: v.optional(
      v.array(
        v.object({
          accepted: v.boolean(),
          category: v.string(),
          keyword: v.string(),
        })
      )
    ),
    suggestedMonitors: v.optional(
      v.array(
        v.object({
          accepted: v.boolean(),
          method: v.optional(v.string()),
          name: v.string(),
          url: v.string(),
        })
      )
    ),
    suggestedPrompts: v.optional(
      v.array(
        v.object({
          prompt: v.string(),
          title: v.string(),
        })
      )
    ),
    suggestedTags: v.optional(
      v.array(
        v.object({
          accepted: v.boolean(),
          color: v.string(),
          name: v.string(),
        })
      )
    ),
    updatedAt: v.number(),
  }).index("by_organization", ["organizationId"]),

  repoAnalysis: defineTable({
    architecture: v.optional(v.string()),
    completedAt: v.optional(v.number()),
    createdAt: v.number(),
    error: v.optional(v.string()),
    features: v.optional(v.string()),
    githubConnectionId: v.id("githubConnections"),
    organizationId: v.id("organizations"),
    repoStructure: v.optional(v.string()),
    status: repoAnalysisStatus,
    summary: v.optional(v.string()),
    techStack: v.optional(v.string()),
    threadId: v.optional(v.string()),
    updatedAt: v.number(),
  }).index("by_organization", ["organizationId"]),
  userGithubConnections: defineTable({
    accountAvatarUrl: v.optional(v.string()),
    accountLogin: v.string(),
    accountType: v.union(v.literal("user"), v.literal("organization")),
    createdAt: v.number(),
    installationId: v.string(),
    status: githubConnectionStatus,
    updatedAt: v.number(),
    userId: v.string(),
  })
    .index("by_user", ["userId"])
    .index("by_installation", ["installationId"]),

  websiteReferences: defineTable({
    createdAt: v.number(),
    description: v.optional(v.string()),
    errorMessage: v.optional(v.string()),
    lastFetchedAt: v.optional(v.number()),
    organizationId: v.id("organizations"),
    scrapedContent: v.optional(v.string()),
    status: websiteReferenceStatus,
    title: v.optional(v.string()),
    updatedAt: v.number(),
    url: v.string(),
  }).index("by_organization", ["organizationId"]),
};
