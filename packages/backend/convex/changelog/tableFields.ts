import { defineTable } from "convex/server";
import { v } from "convex/values";
import { feedbackStatus } from "../shared/validators";

export const changelogTables = {
  changelogSubscribers: defineTable({
    email: v.optional(v.string()),
    organizationId: v.id("organizations"),
    subscribedAt: v.number(),
    unsubscribeToken: v.string(),
    userId: v.optional(v.string()),
  })
    .index("by_user", ["userId"])
    .index("by_organization", ["organizationId"])
    .index("by_user_org", ["userId", "organizationId"])
    .index("by_email_org", ["email", "organizationId"])
    .index("by_unsubscribe_token", ["unsubscribeToken"]),

  releaseCommits: defineTable({
    commits: v.array(
      v.object({
        author: v.string(),
        date: v.string(),
        fullMessage: v.string(),
        message: v.string(),
        sha: v.string(),
      })
    ),
    createdAt: v.number(),
    files: v.optional(
      v.array(
        v.object({
          additions: v.number(),
          deletions: v.number(),
          filename: v.string(),
          status: v.string(),
        })
      )
    ),
    previousTag: v.optional(v.string()),
    releaseId: v.id("releases"),
  }).index("by_release", ["releaseId"]),

  releaseFeedback: defineTable({
    createdAt: v.number(),
    feedbackId: v.id("feedback"),
    releaseId: v.id("releases"),
  })
    .index("by_release", ["releaseId"])
    .index("by_feedback", ["feedbackId"])
    .index("by_release_feedback", ["releaseId", "feedbackId"]),
  releases: defineTable({
    createdAt: v.number(),
    description: v.optional(v.string()),
    githubHtmlUrl: v.optional(v.string()),
    githubPushError: v.optional(v.string()),
    githubPushErrorType: v.optional(v.string()),
    githubPushStatus: v.optional(
      v.union(v.literal("pending"), v.literal("success"), v.literal("failed"))
    ),
    githubReleaseId: v.optional(v.string()),
    organizationId: v.id("organizations"),
    publishedAt: v.optional(v.number()),
    retroactivelyGenerated: v.optional(v.boolean()),
    scheduledBy: v.optional(v.string()),
    scheduledFeedbackStatus: v.optional(feedbackStatus),
    scheduledJobId: v.optional(v.id("_scheduled_functions")),
    scheduledPublishAt: v.optional(v.number()),
    syncedFromGithub: v.optional(v.boolean()),
    title: v.string(),
    updatedAt: v.number(),
    version: v.optional(v.string()),
  })
    .index("by_organization", ["organizationId"])
    .index("by_published", ["organizationId", "publishedAt"])
    .index("by_github_release", ["organizationId", "githubReleaseId"])
    .index("by_scheduled", ["scheduledPublishAt"]),

  retroactiveCommits: defineTable({
    commits: v.array(
      v.object({
        author: v.string(),
        date: v.string(),
        fullMessage: v.string(),
        message: v.string(),
        sha: v.string(),
      })
    ),
    createdAt: v.number(),
    groupId: v.string(),
    jobId: v.id("retroactiveJobs"),
  })
    .index("by_job", ["jobId"])
    .index("by_job_group", ["jobId", "groupId"]),

  retroactiveJobs: defineTable({
    completedAt: v.optional(v.number()),

    createdAt: v.number(),

    // Results
    createdReleaseIds: v.optional(v.array(v.id("releases"))),
    currentStep: v.optional(v.string()),

    // Error info
    error: v.optional(v.string()),
    fetchedCommits: v.optional(v.number()),
    groupingStrategy: v.union(
      v.literal("tags"),
      v.literal("weekly"),
      v.literal("auto")
    ),

    // Commit groups
    groups: v.optional(
      v.array(
        v.object({
          commitCount: v.number(),
          dateFrom: v.number(),
          dateTo: v.number(),
          error: v.optional(v.string()),
          generatedDescription: v.optional(v.string()),
          generatedTitle: v.optional(v.string()),
          id: v.string(),
          releaseId: v.optional(v.id("releases")),
          status: v.union(
            v.literal("pending"),
            v.literal("generating"),
            v.literal("generated"),
            v.literal("created"),
            v.literal("skipped"),
            v.literal("error")
          ),
          title: v.string(),
          version: v.optional(v.string()),
        })
      )
    ),
    organizationId: v.id("organizations"),
    processedGroups: v.optional(v.number()),
    skipExistingVersions: v.boolean(),
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

    // Fetched tags
    tags: v.optional(v.array(v.object({ name: v.string(), sha: v.string() }))),
    targetBranch: v.string(),
    totalCommits: v.optional(v.number()),
    totalGroups: v.optional(v.number()),

    // Progress tracking
    totalTags: v.optional(v.number()),
    updatedAt: v.number(),
  }).index("by_organization", ["organizationId"]),
};
