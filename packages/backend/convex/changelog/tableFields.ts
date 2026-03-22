import { defineTable } from "convex/server";
import { v } from "convex/values";

export const changelogTables = {
  releases: defineTable({
    organizationId: v.id("organizations"),
    title: v.string(),
    description: v.optional(v.string()),
    version: v.optional(v.string()),
    publishedAt: v.optional(v.number()),
    githubReleaseId: v.optional(v.string()),
    githubHtmlUrl: v.optional(v.string()),
    syncedFromGithub: v.optional(v.boolean()),
    githubPushStatus: v.optional(
      v.union(v.literal("pending"), v.literal("success"), v.literal("failed"))
    ),
    githubPushError: v.optional(v.string()),
    githubPushErrorType: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_organization", ["organizationId"])
    .index("by_published", ["organizationId", "publishedAt"])
    .index("by_github_release", ["organizationId", "githubReleaseId"]),

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
};
