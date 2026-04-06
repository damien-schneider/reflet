import { v } from "convex/values";
import { internalQuery, query } from "../../_generated/server";
import { getAuthUser } from "../../shared/utils";

export const getProjectSetup = query({
  args: { organizationId: v.id("organizations") },
  returns: v.union(
    v.object({
      _id: v.id("projectSetupResults"),
      _creationTime: v.number(),
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
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);

    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_org_user", (q) =>
        q.eq("organizationId", args.organizationId).eq("userId", user._id)
      )
      .unique();

    if (!membership) {
      return null;
    }

    return await ctx.db
      .query("projectSetupResults")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .order("desc")
      .first();
  },
});

export const getSetupStatus = query({
  args: { organizationId: v.id("organizations") },
  returns: v.union(
    v.object({
      setupCompleted: v.boolean(),
      hasGitHub: v.boolean(),
      hasAnalysis: v.boolean(),
      repositoryFullName: v.optional(v.string()),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);

    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_org_user", (q) =>
        q.eq("organizationId", args.organizationId).eq("userId", user._id)
      )
      .unique();

    if (!membership) {
      return null;
    }

    const org = await ctx.db.get(args.organizationId);
    if (!org) {
      return null;
    }

    const connection = await ctx.db
      .query("githubConnections")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .first();

    const analysis = await ctx.db
      .query("repoAnalysis")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .order("desc")
      .first();

    return {
      setupCompleted: org.setupCompleted ?? false,
      hasGitHub:
        connection?.status === "connected" && !!connection.repositoryId,
      hasAnalysis: analysis?.status === "completed",
      repositoryFullName: connection?.repositoryFullName ?? undefined,
    };
  },
});

export const getConnectionForSetup = internalQuery({
  args: { organizationId: v.id("organizations") },
  returns: v.union(
    v.object({
      connectionId: v.id("githubConnections"),
      installationId: v.string(),
      repositoryFullName: v.string(),
      defaultBranch: v.string(),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const connection = await ctx.db
      .query("githubConnections")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .first();

    if (!connection?.repositoryFullName) {
      return null;
    }

    return {
      connectionId: connection._id,
      installationId: connection.installationId,
      repositoryFullName: connection.repositoryFullName,
      defaultBranch: connection.repositoryDefaultBranch ?? "main",
    };
  },
});
