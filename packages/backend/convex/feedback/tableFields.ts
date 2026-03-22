import { defineTable } from "convex/server";
import { v } from "convex/values";
import { feedbackStatus } from "../shared/validators";

export const feedbackTables = {
  feedback: defineTable({
    organizationId: v.id("organizations"),
    title: v.string(),
    description: v.string(),
    status: feedbackStatus,
    organizationStatusId: v.optional(v.id("organizationStatuses")),
    authorId: v.optional(v.string()),
    voteCount: v.number(),
    commentCount: v.number(),
    isApproved: v.boolean(),
    isPinned: v.boolean(),
    roadmapOrder: v.optional(v.number()),
    completedAt: v.optional(v.number()),
    githubIssueId: v.optional(v.string()),
    githubIssueNumber: v.optional(v.number()),
    githubHtmlUrl: v.optional(v.string()),
    syncedFromGithub: v.optional(v.boolean()),
    aiClarification: v.optional(v.string()),
    aiClarificationGeneratedAt: v.optional(v.number()),
    aiDraftReply: v.optional(v.string()),
    aiDraftReplyGeneratedAt: v.optional(v.number()),
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
    aiPriority: v.optional(
      v.union(
        v.literal("critical"),
        v.literal("high"),
        v.literal("medium"),
        v.literal("low"),
        v.literal("none")
      )
    ),
    aiPriorityReasoning: v.optional(v.string()),
    aiPriorityGeneratedAt: v.optional(v.number()),
    aiComplexity: v.optional(
      v.union(
        v.literal("trivial"),
        v.literal("simple"),
        v.literal("moderate"),
        v.literal("complex"),
        v.literal("very_complex")
      )
    ),
    aiComplexityReasoning: v.optional(v.string()),
    aiComplexityGeneratedAt: v.optional(v.number()),
    aiTimeEstimate: v.optional(v.string()),
    aiTimeEstimateGeneratedAt: v.optional(v.number()),
    priority: v.optional(
      v.union(
        v.literal("critical"),
        v.literal("high"),
        v.literal("medium"),
        v.literal("low"),
        v.literal("none")
      )
    ),
    complexity: v.optional(
      v.union(
        v.literal("trivial"),
        v.literal("simple"),
        v.literal("moderate"),
        v.literal("complex"),
        v.literal("very_complex")
      )
    ),
    timeEstimate: v.optional(v.string()),
    deadline: v.optional(v.number()),
    externalUserId: v.optional(v.id("externalUsers")),
    assigneeId: v.optional(v.string()),
    attachments: v.optional(v.array(v.string())),
    source: v.optional(
      v.union(v.literal("web"), v.literal("api"), v.literal("widget"))
    ),
    createdAt: v.number(),
    updatedAt: v.number(),
    deletedAt: v.optional(v.number()),
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

  feedbackVotes: defineTable({
    feedbackId: v.id("feedback"),
    userId: v.optional(v.string()),
    voteType: v.union(v.literal("upvote"), v.literal("downvote")),
    externalUserId: v.optional(v.id("externalUsers")),
    createdAt: v.number(),
  })
    .index("by_feedback", ["feedbackId"])
    .index("by_user", ["userId"])
    .index("by_feedback_user", ["feedbackId", "userId"])
    .index("by_feedback_external_user", ["feedbackId", "externalUserId"]),

  feedbackImportanceVotes: defineTable({
    feedbackId: v.id("feedback"),
    userId: v.string(),
    importance: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_feedback", ["feedbackId"])
    .index("by_user", ["userId"])
    .index("by_feedback_user", ["feedbackId", "userId"]),

  feedbackSubscriptions: defineTable({
    feedbackId: v.id("feedback"),
    userId: v.optional(v.string()),
    externalUserId: v.optional(v.id("externalUsers")),
    createdAt: v.number(),
  })
    .index("by_feedback", ["feedbackId"])
    .index("by_user", ["userId"])
    .index("by_feedback_user", ["feedbackId", "userId"])
    .index("by_feedback_external_user", ["feedbackId", "externalUserId"]),

  feedbackTags: defineTable({
    feedbackId: v.id("feedback"),
    tagId: v.id("tags"),
    appliedByAi: v.optional(v.boolean()),
  })
    .index("by_feedback", ["feedbackId"])
    .index("by_tag", ["tagId"])
    .index("by_feedback_tag", ["feedbackId", "tagId"]),

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

  comments: defineTable({
    feedbackId: v.id("feedback"),
    authorId: v.optional(v.string()),
    body: v.string(),
    isOfficial: v.boolean(),
    parentId: v.optional(v.id("comments")),
    externalUserId: v.optional(v.id("externalUsers")),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_feedback", ["feedbackId"])
    .index("by_author", ["authorId"])
    .index("by_parent", ["parentId"])
    .index("by_external_user", ["externalUserId"]),
};
