import { defineTable } from "convex/server";
import { v } from "convex/values";
import { feedbackStatus } from "../shared/validators";

export const changelogTables = {
  releases: defineTable({
    organizationId: v.id("organizations"),
    title: v.string(),
    description: v.optional(v.string()),
    version: v.optional(v.string()),
    publishedAt: v.optional(v.number()),
    scheduledPublishAt: v.optional(v.number()),
    scheduledBy: v.optional(v.string()),
    scheduledFeedbackStatus: v.optional(feedbackStatus),
    scheduledJobId: v.optional(v.id("_scheduled_functions")),
    githubReleaseId: v.optional(v.string()),
    githubHtmlUrl: v.optional(v.string()),
    syncedFromGithub: v.optional(v.boolean()),
    githubPushStatus: v.optional(
      v.union(v.literal("pending"), v.literal("success"), v.literal("failed"))
    ),
    githubPushError: v.optional(v.string()),
    githubPushErrorType: v.optional(v.string()),
    retroactivelyGenerated: v.optional(v.boolean()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_organization", ["organizationId"])
    .index("by_published", ["organizationId", "publishedAt"])
    .index("by_github_release", ["organizationId", "githubReleaseId"])
    .index("by_scheduled", ["scheduledPublishAt"]),

  releaseFeedback: defineTable({
    releaseId: v.id("releases"),
    feedbackId: v.id("feedback"),
    createdAt: v.number(),
  })
    .index("by_release", ["releaseId"])
    .index("by_feedback", ["feedbackId"])
    .index("by_release_feedback", ["releaseId", "feedbackId"]),

  releaseCommits: defineTable({
    releaseId: v.id("releases"),
    commits: v.array(
      v.object({
        sha: v.string(),
        message: v.string(),
        fullMessage: v.string(),
        author: v.string(),
        date: v.string(),
      })
    ),
    files: v.optional(
      v.array(
        v.object({
          filename: v.string(),
          status: v.string(),
          additions: v.number(),
          deletions: v.number(),
        })
      )
    ),
    previousTag: v.optional(v.string()),
    createdAt: v.number(),
  }).index("by_release", ["releaseId"]),

  changelogSubscribers: defineTable({
    userId: v.optional(v.string()),
    email: v.optional(v.string()),
    organizationId: v.id("organizations"),
    subscribedAt: v.number(),
    unsubscribeToken: v.string(),
  })
    .index("by_user", ["userId"])
    .index("by_organization", ["organizationId"])
    .index("by_user_org", ["userId", "organizationId"])
    .index("by_email_org", ["email", "organizationId"])
    .index("by_unsubscribe_token", ["unsubscribeToken"]),

  retroactiveJobs: defineTable({
    organizationId: v.id("organizations"),
    status: v.union(
      v.literal("pending"),
      v.literal("fetching_tags"),
      v.literal("fetching_commits"),
      v.literal("generating"),
      v.literal("creating_releases"),
      v.literal("completed"),
      v.literal("error"),
      v.literal("cancelled")
    ),
    groupingStrategy: v.union(
      v.literal("tags"),
      v.literal("monthly"),
      v.literal("auto")
    ),
    targetBranch: v.string(),
    skipExistingVersions: v.boolean(),

    // Progress tracking
    totalTags: v.optional(v.number()),
    totalCommits: v.optional(v.number()),
    fetchedCommits: v.optional(v.number()),
    totalGroups: v.optional(v.number()),
    processedGroups: v.optional(v.number()),
    currentStep: v.optional(v.string()),

    // Fetched tags
    tags: v.optional(v.array(v.object({ name: v.string(), sha: v.string() }))),

    // Commit groups
    groups: v.optional(
      v.array(
        v.object({
          id: v.string(),
          title: v.string(),
          version: v.optional(v.string()),
          dateFrom: v.number(),
          dateTo: v.number(),
          commitCount: v.number(),
          status: v.union(
            v.literal("pending"),
            v.literal("generating"),
            v.literal("generated"),
            v.literal("created"),
            v.literal("skipped"),
            v.literal("error")
          ),
          generatedTitle: v.optional(v.string()),
          generatedDescription: v.optional(v.string()),
          releaseId: v.optional(v.id("releases")),
          error: v.optional(v.string()),
        })
      )
    ),

    // Results
    createdReleaseIds: v.optional(v.array(v.id("releases"))),

    // Error info
    error: v.optional(v.string()),

    createdAt: v.number(),
    updatedAt: v.number(),
    completedAt: v.optional(v.number()),
  }).index("by_organization", ["organizationId"]),

  retroactiveCommits: defineTable({
    jobId: v.id("retroactiveJobs"),
    groupId: v.string(),
    commits: v.array(
      v.object({
        sha: v.string(),
        message: v.string(),
        fullMessage: v.string(),
        author: v.string(),
        date: v.string(),
      })
    ),
    createdAt: v.number(),
  })
    .index("by_job", ["jobId"])
    .index("by_job_group", ["jobId", "groupId"]),
};
