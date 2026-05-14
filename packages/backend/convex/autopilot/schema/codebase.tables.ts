import { defineTable } from "convex/server";
import { v } from "convex/values";

export const codebaseTables = {
  codebaseFileCache: defineTable({
    installationId: v.string(),
    repoFullName: v.string(),
    sha: v.string(),
    path: v.string(),
    content: v.string(),
    fetchedAt: v.number(),
  })
    .index("by_key", ["installationId", "repoFullName", "sha", "path"])
    .index("by_repo", ["installationId", "repoFullName"]),

  codebaseRepoMetadata: defineTable({
    installationId: v.string(),
    repoFullName: v.string(),
    description: v.optional(v.string()),
    languages: v.array(v.object({ name: v.string(), bytes: v.number() })),
    topics: v.array(v.string()),
    defaultBranch: v.string(),
    latestSha: v.optional(v.string()),
    refreshedAt: v.number(),
  }).index("by_repo", ["installationId", "repoFullName"]),

  codebaseAgentRuns: defineTable({
    organizationId: v.id("organizations"),
    repoFullName: v.string(),
    purpose: v.union(v.literal("deep_analysis"), v.literal("ask")),
    status: v.union(
      v.literal("running"),
      v.literal("completed"),
      v.literal("failed")
    ),
    userQuestion: v.optional(v.string()),
    assistantText: v.optional(v.string()),
    toolCallCount: v.number(),
    inputTokens: v.optional(v.number()),
    outputTokens: v.optional(v.number()),
    costUsd: v.optional(v.number()),
    error: v.optional(v.string()),
    startedAt: v.number(),
    finishedAt: v.optional(v.number()),
  })
    .index("by_org", ["organizationId"])
    .index("by_org_started", ["organizationId", "startedAt"]),
};
