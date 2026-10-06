import { v } from "convex/values";
import { internal } from "../../_generated/api";
import { mutation, query } from "../../_generated/server";
import { consumeAiGenerationFor } from "../../ai/usage_gate";
import { versionIncrementValidator } from "../../changelog/semver";
import { tagColorValidator } from "../../feedback/tag_colors";
import {
  insertKeyword,
  isSameKeyword,
  type KeywordIdentity,
} from "../../intelligence/keywords";
import { keywordSource } from "../../intelligence/tableFields";
import {
  isOrgMemberViewer,
  requireOrgAdmin,
  requireOrgMember,
} from "../../shared/access";
import { insertMonitor } from "../../status/monitors";
import {
  projectSetupResultValidator,
  SETUP_STEPS,
} from "./project_setup_validators";

const SLUG_SANITIZE_REGEX = /[^a-z0-9]+/g;

export const getProjectSetup = query({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    if (!(await isOrgMemberViewer(ctx, args.organizationId))) {
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
  returns: v.union(projectSetupResultValidator, v.null()),
});

export const getSetupStatus = query({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    if (!(await isOrgMemberViewer(ctx, args.organizationId))) {
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
      hasAnalysis: analysis?.status === "completed",
      hasGitHub:
        connection?.status === "connected" && !!connection.repositoryId,
      repositoryFullName: connection?.repositoryFullName ?? undefined,
      setupCompleted: org.setupCompleted ?? false,
    };
  },
  returns: v.union(
    v.object({
      hasAnalysis: v.boolean(),
      hasGitHub: v.boolean(),
      repositoryFullName: v.optional(v.string()),
      setupCompleted: v.boolean(),
    }),
    v.null()
  ),
});

export const startProjectSetup = mutation({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    const { user } = await requireOrgAdmin(
      ctx,
      args.organizationId,
      "run project setup"
    );
    await consumeAiGenerationFor(ctx, {
      organizationId: args.organizationId,
      userId: user._id,
    });

    const connection = await ctx.db
      .query("githubConnections")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .first();

    if (!connection?.repositoryId) {
      throw new Error("No GitHub repository connected");
    }

    const now = Date.now();

    const setupId = await ctx.db.insert("projectSetupResults", {
      createdAt: now,
      githubConnectionId: connection._id,
      organizationId: args.organizationId,
      status: "analyzing",
      steps: SETUP_STEPS.map((step) => ({
        key: step.key,
        label: step.label,
        status: "pending" as const,
      })),
      updatedAt: now,
    });

    await ctx.scheduler.runAfter(
      0,
      internal.integrations.github.project_setup_action.runProjectSetup,
      { organizationId: args.organizationId, setupId }
    );

    return setupId;
  },
  returns: v.id("projectSetupResults"),
});

export const applySetupResults = mutation({
  args: {
    acceptedKeywords: v.array(
      v.object({ keyword: v.string(), source: keywordSource })
    ),
    acceptedMonitors: v.array(
      v.object({
        name: v.string(),
        url: v.string(),
      })
    ),
    acceptedTags: v.array(
      v.object({
        color: tagColorValidator,
        name: v.string(),
      })
    ),
    changelogSettings: v.optional(
      v.object({
        autoPublishImported: v.optional(v.boolean()),
        autoVersioning: v.optional(v.boolean()),
        pushToGithubOnPublish: v.optional(v.boolean()),
        targetBranch: v.optional(v.string()),
        versionIncrement: v.optional(versionIncrementValidator),
        versionPrefix: v.optional(v.string()),
      })
    ),
    organizationId: v.id("organizations"),
    setupId: v.id("projectSetupResults"),
  },
  handler: async (ctx, args) => {
    await requireOrgAdmin(ctx, args.organizationId, "apply project setup");
    const setup = await ctx.db.get(args.setupId);
    if (setup?.organizationId !== args.organizationId) {
      throw new Error("Setup not found");
    }

    const now = Date.now();

    for (const monitor of args.acceptedMonitors) {
      await insertMonitor(ctx, {
        ...monitor,
        organizationId: args.organizationId,
      });
    }

    const trackedKeywords: KeywordIdentity[] = await ctx.db
      .query("intelligenceKeywords")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .collect();
    for (const proposal of args.acceptedKeywords) {
      const candidate = { ...proposal, keyword: proposal.keyword.trim() };
      if (trackedKeywords.some((k) => isSameKeyword(k, candidate))) {
        continue;
      }
      await insertKeyword(ctx, {
        ...proposal,
        organizationId: args.organizationId,
      });
      trackedKeywords.push(candidate);
    }

    const existingTags = await ctx.db
      .query("tags")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .collect();

    const existingSlugs = new Set(existingTags.map((t) => t.slug));

    for (const tag of args.acceptedTags) {
      const slug = tag.name.toLowerCase().replace(SLUG_SANITIZE_REGEX, "-");
      if (existingSlugs.has(slug)) {
        continue;
      }
      await ctx.db.insert("tags", {
        color: tag.color,
        createdAt: now,
        name: tag.name,
        organizationId: args.organizationId,
        slug,
        updatedAt: now,
      });
      existingSlugs.add(slug);
    }

    if (args.changelogSettings) {
      const org = await ctx.db.get(args.organizationId);
      await ctx.db.patch(args.organizationId, {
        changelogSettings: {
          ...org?.changelogSettings,
          ...args.changelogSettings,
        },
      });
    }

    if (args.acceptedKeywords.length > 0) {
      const existingConfig = await ctx.db
        .query("intelligenceConfig")
        .withIndex("by_organization", (q) =>
          q.eq("organizationId", args.organizationId)
        )
        .unique();

      if (!existingConfig) {
        await ctx.db.insert("intelligenceConfig", {
          competitorTrackingEnabled: false,
          createdAt: now,
          organizationId: args.organizationId,
          redditEnabled: true,
          scanFrequency: "weekly",
          updatedAt: now,
          webSearchEnabled: true,
        });
      }
    }

    await ctx.db.patch(args.organizationId, {
      setupCompleted: true,
      setupMethod: "github",
    });

    await ctx.db.patch(args.setupId, {
      completedAt: now,
      status: "completed",
      updatedAt: now,
    });

    return null;
  },
  returns: v.null(),
});

export const skipSetup = mutation({
  args: {
    method: v.union(v.literal("manual"), v.literal("skipped")),
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    await requireOrgMember(ctx, args.organizationId);

    await ctx.db.patch(args.organizationId, {
      setupCompleted: true,
      setupMethod: args.method,
    });

    return null;
  },
  returns: v.null(),
});
