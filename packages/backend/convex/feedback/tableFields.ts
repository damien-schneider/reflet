import { defineTable } from "convex/server";
import { v } from "convex/values";
import { feedbackStatus } from "../shared/validators";

export const feedbackTables = {
  autoTaggingJobs: defineTable({
    completedAt: v.optional(v.number()),
    errors: v.array(
      v.object({
        error: v.string(),
        feedbackId: v.id("feedback"),
      })
    ),
    failedItems: v.number(),
    organizationId: v.id("organizations"),
    processedItems: v.number(),
    startedAt: v.number(),
    status: v.union(
      v.literal("pending"),
      v.literal("processing"),
      v.literal("completed"),
      v.literal("failed")
    ),
    successfulItems: v.number(),
    totalItems: v.number(),
  }).index("by_organization", ["organizationId"]),

  comments: defineTable({
    authorId: v.optional(v.string()),
    body: v.string(),
    createdAt: v.number(),
    externalUserId: v.optional(v.id("externalUsers")),
    feedbackId: v.id("feedback"),
    isOfficial: v.boolean(),
    parentId: v.optional(v.id("comments")),
    updatedAt: v.number(),
  })
    .index("by_feedback", ["feedbackId"])
    .index("by_author", ["authorId"])
    .index("by_parent", ["parentId"])
    .index("by_external_user", ["externalUserId"]),
  feedback: defineTable({
    aiClarification: v.optional(v.string()),
    aiClarificationGeneratedAt: v.optional(v.number()),
    aiComplexity: v.optional(
      v.union(
        v.literal("trivial"),
        v.literal("simple"),
        v.literal("moderate"),
        v.literal("complex"),
        v.literal("very_complex")
      )
    ),
    aiComplexityGeneratedAt: v.optional(v.number()),
    aiComplexityReasoning: v.optional(v.string()),
    aiDifficultyGeneratedAt: v.optional(v.number()),
    aiDifficultyReasoning: v.optional(v.string()),
    aiDifficultyScore: v.optional(
      v.union(
        v.literal("trivial"),
        v.literal("easy"),
        v.literal("medium"),
        v.literal("hard"),
        v.literal("complex")
      )
    ),
    aiDraftReply: v.optional(v.string()),
    aiDraftReplyGeneratedAt: v.optional(v.number()),
    aiFeatureCheckError: v.optional(v.string()),
    aiFeatureCheckEvidence: v.optional(
      v.array(
        v.object({
          filePath: v.string(),
          relevance: v.string(),
          snippet: v.optional(v.string()),
        })
      )
    ),
    aiFeatureCheckGeneratedAt: v.optional(v.number()),
    aiFeatureCheckResult: v.optional(
      v.union(
        v.literal("implemented"),
        v.literal("partially_implemented"),
        v.literal("not_implemented"),
        v.literal("inconclusive")
      )
    ),
    aiFeatureCheckStatus: v.optional(
      v.union(
        v.literal("pending"),
        v.literal("checking"),
        v.literal("completed"),
        v.literal("error")
      )
    ),
    aiFeatureCheckSummary: v.optional(v.string()),
    aiPriority: v.optional(
      v.union(
        v.literal("critical"),
        v.literal("high"),
        v.literal("medium"),
        v.literal("low"),
        v.literal("none")
      )
    ),
    aiPriorityGeneratedAt: v.optional(v.number()),
    aiPriorityReasoning: v.optional(v.string()),
    aiTimeEstimate: v.optional(v.string()),
    aiTimeEstimateGeneratedAt: v.optional(v.number()),
    assigneeId: v.optional(v.string()),
    attachments: v.optional(v.array(v.string())),
    authorId: v.optional(v.string()),
    commentCount: v.number(),
    completedAt: v.optional(v.number()),
    complexity: v.optional(
      v.union(
        v.literal("trivial"),
        v.literal("simple"),
        v.literal("moderate"),
        v.literal("complex"),
        v.literal("very_complex")
      )
    ),
    createdAt: v.number(),
    deadline: v.optional(v.number()),
    deletedAt: v.optional(v.number()),
    description: v.string(),
    externalUserId: v.optional(v.id("externalUsers")),
    githubHtmlUrl: v.optional(v.string()),
    githubIssueId: v.optional(v.string()),
    githubIssueNumber: v.optional(v.number()),
    isApproved: v.boolean(),
    isMerged: v.optional(v.boolean()),
    isPinned: v.boolean(),
    mergedIntoId: v.optional(v.id("feedback")),
    organizationId: v.id("organizations"),
    organizationStatusId: v.optional(v.id("organizationStatuses")),
    priority: v.optional(
      v.union(
        v.literal("critical"),
        v.literal("high"),
        v.literal("medium"),
        v.literal("low"),
        v.literal("none")
      )
    ),
    roadmapOrder: v.optional(v.number()),
    source: v.optional(
      v.union(v.literal("web"), v.literal("api"), v.literal("widget"))
    ),
    status: feedbackStatus,
    syncedFromGithub: v.optional(v.boolean()),
    timeEstimate: v.optional(v.string()),
    title: v.string(),
    updatedAt: v.number(),
    voteCount: v.number(),
  })
    .index("by_organization", ["organizationId"])
    .index("by_author", ["authorId"])
    .index("by_status", ["status"])
    .index("by_org_status_id", ["organizationStatusId"])
    .index("by_github_issue", ["organizationId", "githubIssueId"])
    .index("by_external_user", ["externalUserId"])
    .index("by_assignee", ["organizationId", "assigneeId"])
    .index("by_merged_into", ["mergedIntoId"])
    .searchIndex("search_title", {
      filterFields: ["organizationId"],
      searchField: "title",
    }),

  feedbackImportanceVotes: defineTable({
    createdAt: v.number(),
    feedbackId: v.id("feedback"),
    importance: v.number(),
    updatedAt: v.number(),
    userId: v.string(),
  })
    .index("by_feedback", ["feedbackId"])
    .index("by_user", ["userId"])
    .index("by_feedback_user", ["feedbackId", "userId"]),

  feedbackScreenshots: defineTable({
    annotatedStorageId: v.optional(v.id("_storage")),
    annotations: v.optional(
      v.array(
        v.object({
          color: v.optional(v.string()),
          endX: v.optional(v.number()),
          endY: v.optional(v.number()),
          height: v.optional(v.number()),
          text: v.optional(v.string()),
          type: v.union(
            v.literal("rectangle"),
            v.literal("arrow"),
            v.literal("text"),
            v.literal("blur")
          ),
          width: v.optional(v.number()),
          x: v.number(),
          y: v.number(),
        })
      )
    ),
    captureSource: v.union(
      v.literal("widget"),
      v.literal("upload"),
      v.literal("paste")
    ),
    createdAt: v.number(),
    externalUserId: v.optional(v.id("externalUsers")),
    feedbackId: v.id("feedback"),
    filename: v.string(),
    height: v.optional(v.number()),
    mimeType: v.string(),
    organizationId: v.id("organizations"),
    pageUrl: v.optional(v.string()),
    size: v.number(),
    storageId: v.id("_storage"),
    uploadedBy: v.optional(v.string()),
    width: v.optional(v.number()),
  })
    .index("by_feedback", ["feedbackId"])
    .index("by_organization", ["organizationId"]),

  feedbackSubscriptions: defineTable({
    createdAt: v.number(),
    externalUserId: v.optional(v.id("externalUsers")),
    feedbackId: v.id("feedback"),
    userId: v.optional(v.string()),
  })
    .index("by_feedback", ["feedbackId"])
    .index("by_user", ["userId"])
    .index("by_feedback_user", ["feedbackId", "userId"])
    .index("by_feedback_external_user", ["feedbackId", "externalUserId"]),

  feedbackTags: defineTable({
    appliedByAi: v.optional(v.boolean()),
    feedbackId: v.id("feedback"),
    tagId: v.id("tags"),
  })
    .index("by_feedback", ["feedbackId"])
    .index("by_tag", ["tagId"])
    .index("by_feedback_tag", ["feedbackId", "tagId"]),

  feedbackVotes: defineTable({
    createdAt: v.number(),
    externalUserId: v.optional(v.id("externalUsers")),
    feedbackId: v.id("feedback"),
    userId: v.optional(v.string()),
    voteType: v.union(v.literal("upvote"), v.literal("downvote")),
  })
    .index("by_feedback", ["feedbackId"])
    .index("by_user", ["userId"])
    .index("by_feedback_user", ["feedbackId", "userId"])
    .index("by_feedback_external_user", ["feedbackId", "externalUserId"]),
};
