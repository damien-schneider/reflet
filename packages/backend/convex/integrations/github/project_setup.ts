import { v } from "convex/values";
import { internal } from "../../_generated/api";
import {
  internalAction,
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "../../_generated/server";
import { repoAnalysisAgent } from "../../ai/agent";
import { getAuthUser } from "../../shared/utils";
import { fetchGitHubReleases, fetchRepoData } from "./github_helpers";

// ============================================
// STEP DEFINITIONS
// ============================================

const SLUG_SANITIZE_REGEX = /[^a-z0-9]+/g;
const JSON_ARRAY_REGEX = /\[[\s\S]*\]/;
const SEMVER_TAG_REGEX = /^v?\d+\.\d+/;

const SETUP_STEPS = [
  { key: "analyze_codebase", label: "Analyzing codebase" },
  { key: "discover_services", label: "Discovering services" },
  { key: "extract_keywords", label: "Extracting market keywords" },
  { key: "configure_changelog", label: "Configuring changelog" },
  { key: "suggest_tags", label: "Suggesting tags" },
  { key: "generate_prompts", label: "Generating AI context" },
] as const;

// ============================================
// QUERIES
// ============================================

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

// ============================================
// INTERNAL QUERIES
// ============================================

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

// ============================================
// MUTATIONS
// ============================================

export const startProjectSetup = mutation({
  args: { organizationId: v.id("organizations") },
  returns: v.id("projectSetupResults"),
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);

    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_org_user", (q) =>
        q.eq("organizationId", args.organizationId).eq("userId", user._id)
      )
      .unique();

    if (!membership || membership.role === "member") {
      throw new Error("Only admins can run project setup");
    }

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
      organizationId: args.organizationId,
      githubConnectionId: connection._id,
      status: "analyzing",
      steps: SETUP_STEPS.map((step) => ({
        key: step.key,
        label: step.label,
        status: "pending" as const,
      })),
      createdAt: now,
      updatedAt: now,
    });

    await ctx.scheduler.runAfter(
      0,
      internal.integrations.github.project_setup.runProjectSetup,
      { setupId, organizationId: args.organizationId }
    );

    return setupId;
  },
});

export const updateStepStatus = internalMutation({
  args: {
    setupId: v.id("projectSetupResults"),
    stepKey: v.string(),
    status: v.union(
      v.literal("pending"),
      v.literal("running"),
      v.literal("done"),
      v.literal("error")
    ),
    summary: v.optional(v.string()),
    error: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const setup = await ctx.db.get(args.setupId);
    if (!setup) {
      return null;
    }

    const updatedSteps = setup.steps.map((step) => {
      if (step.key !== args.stepKey) {
        return step;
      }
      return {
        ...step,
        status: args.status,
        summary: args.summary ?? step.summary,
        error: args.error ?? step.error,
      };
    });

    await ctx.db.patch(args.setupId, {
      steps: updatedSteps,
      updatedAt: Date.now(),
    });

    return null;
  },
});

export const updateSetupResults = internalMutation({
  args: {
    setupId: v.id("projectSetupResults"),
    status: v.optional(
      v.union(
        v.literal("idle"),
        v.literal("analyzing"),
        v.literal("review"),
        v.literal("completed"),
        v.literal("error")
      )
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
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { setupId, ...updates } = args;
    const now = Date.now();

    const patchData: Record<string, unknown> = { updatedAt: now };

    if (updates.status !== undefined) {
      patchData.status = updates.status;
    }
    if (updates.suggestedMonitors !== undefined) {
      patchData.suggestedMonitors = updates.suggestedMonitors;
    }
    if (updates.suggestedKeywords !== undefined) {
      patchData.suggestedKeywords = updates.suggestedKeywords;
    }
    if (updates.suggestedTags !== undefined) {
      patchData.suggestedTags = updates.suggestedTags;
    }
    if (updates.changelogConfig !== undefined) {
      patchData.changelogConfig = updates.changelogConfig;
    }
    if (updates.suggestedPrompts !== undefined) {
      patchData.suggestedPrompts = updates.suggestedPrompts;
    }
    if (updates.projectOverview !== undefined) {
      patchData.projectOverview = updates.projectOverview;
    }
    if (updates.error !== undefined) {
      patchData.error = updates.error;
    }

    await ctx.db.patch(setupId, patchData);
    return null;
  },
});

export const applySetupResults = mutation({
  args: {
    organizationId: v.id("organizations"),
    setupId: v.id("projectSetupResults"),
    acceptedMonitors: v.array(
      v.object({
        url: v.string(),
        name: v.string(),
      })
    ),
    acceptedKeywords: v.array(
      v.object({
        keyword: v.string(),
        source: v.union(
          v.literal("reddit"),
          v.literal("web"),
          v.literal("both")
        ),
      })
    ),
    acceptedTags: v.array(
      v.object({
        name: v.string(),
        color: v.string(),
      })
    ),
    changelogSettings: v.optional(
      v.object({
        autoPublishImported: v.optional(v.boolean()),
        autoVersioning: v.optional(v.boolean()),
        pushToGithubOnPublish: v.optional(v.boolean()),
        syncDirection: v.optional(v.string()),
        targetBranch: v.optional(v.string()),
        versionIncrement: v.optional(v.string()),
        versionPrefix: v.optional(v.string()),
      })
    ),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);

    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_org_user", (q) =>
        q.eq("organizationId", args.organizationId).eq("userId", user._id)
      )
      .unique();

    if (!membership || membership.role === "member") {
      throw new Error("Only admins can apply project setup");
    }

    const now = Date.now();

    // Create monitors
    for (const monitor of args.acceptedMonitors) {
      await ctx.db.insert("statusMonitors", {
        organizationId: args.organizationId,
        name: monitor.name,
        url: monitor.url,
        checkIntervalMinutes: 5,
        alertThreshold: 3,
        status: "operational",
        consecutiveFailures: 0,
        isPublic: true,
        createdAt: now,
        updatedAt: now,
      });
    }

    // Create keywords
    for (const keyword of args.acceptedKeywords) {
      await ctx.db.insert("intelligenceKeywords", {
        organizationId: args.organizationId,
        keyword: keyword.keyword,
        source: keyword.source,
        createdAt: now,
      });
    }

    // Create tags (check for existing slugs first)
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
        organizationId: args.organizationId,
        name: tag.name,
        slug,
        color: tag.color,
        isDoneStatus: false,
        isRoadmapLane: false,
        createdAt: now,
        updatedAt: now,
      });
      existingSlugs.add(slug);
    }

    // Update changelog settings
    if (args.changelogSettings) {
      await ctx.db.patch(args.organizationId, {
        changelogSettings: args.changelogSettings,
      });
    }

    // Enable intelligence if keywords were added
    if (args.acceptedKeywords.length > 0) {
      const existingConfig = await ctx.db
        .query("intelligenceConfig")
        .withIndex("by_organization", (q) =>
          q.eq("organizationId", args.organizationId)
        )
        .unique();

      if (!existingConfig) {
        await ctx.db.insert("intelligenceConfig", {
          organizationId: args.organizationId,
          scanFrequency: "weekly",
          redditEnabled: true,
          webSearchEnabled: true,
          competitorTrackingEnabled: false,
          createdAt: now,
          updatedAt: now,
        });
      }
    }

    // Mark setup as completed
    await ctx.db.patch(args.organizationId, {
      setupCompleted: true,
      setupMethod: "github",
    });

    await ctx.db.patch(args.setupId, {
      status: "completed",
      completedAt: now,
      updatedAt: now,
    });

    return null;
  },
});

export const skipSetup = mutation({
  args: {
    organizationId: v.id("organizations"),
    method: v.union(v.literal("manual"), v.literal("skipped")),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);

    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_org_user", (q) =>
        q.eq("organizationId", args.organizationId).eq("userId", user._id)
      )
      .unique();

    if (!membership) {
      throw new Error("Not a member of this organization");
    }

    await ctx.db.patch(args.organizationId, {
      setupCompleted: true,
      setupMethod: args.method,
    });

    return null;
  },
});

// ============================================
// ACTIONS
// ============================================

export const runProjectSetup = internalAction({
  args: {
    setupId: v.id("projectSetupResults"),
    organizationId: v.id("organizations"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    try {
      const connection = await ctx.runQuery(
        internal.integrations.github.project_setup.getConnectionForSetup,
        { organizationId: args.organizationId }
      );

      if (!connection) {
        throw new Error("No GitHub connection found");
      }

      const { repositoryFullName, defaultBranch } = connection;

      // Step 1: Analyze codebase
      await ctx.runMutation(
        internal.integrations.github.project_setup.updateStepStatus,
        {
          setupId: args.setupId,
          stepKey: "analyze_codebase",
          status: "running",
        }
      );

      const repoData = await fetchRepoData(repositoryFullName);

      const analysisResult = await repoAnalysisAgent.generateText(
        ctx,
        { userId: "system" },
        {
          prompt: `Analyze this GitHub repository: ${repositoryFullName}

## Root Directory
${repoData.rootContents}

## File Tree
${repoData.fileTree}

## README
${repoData.readme ?? "No README found"}

## package.json
${repoData.packageJson ?? "No package.json found"}

Provide a concise project overview (2-3 sentences describing what this project does, its tech stack, and its target audience).`,
        }
      );

      const projectOverview = analysisResult.text.trim();

      // Also create repo analysis record if none exists
      const existingAnalysis = await ctx.runQuery(
        internal.integrations.github.repo_analysis.getConnectionForAnalysis,
        { organizationId: args.organizationId }
      );
      if (existingAnalysis) {
        // Schedule a full repo analysis in background
        const analysisId = await ctx.runMutation(
          internal.integrations.github.project_setup.createRepoAnalysisRecord,
          {
            organizationId: args.organizationId,
            connectionId: connection.connectionId,
          }
        );
        if (analysisId) {
          await ctx.scheduler.runAfter(
            0,
            internal.integrations.github.repo_analysis.runAnalysis,
            { analysisId, organizationId: args.organizationId }
          );
        }
      }

      await ctx.runMutation(
        internal.integrations.github.project_setup.updateStepStatus,
        {
          setupId: args.setupId,
          stepKey: "analyze_codebase",
          status: "done",
          summary: projectOverview.slice(0, 200),
        }
      );

      await ctx.runMutation(
        internal.integrations.github.project_setup.updateSetupResults,
        { setupId: args.setupId, projectOverview }
      );

      // Step 2: Discover services
      await ctx.runMutation(
        internal.integrations.github.project_setup.updateStepStatus,
        {
          setupId: args.setupId,
          stepKey: "discover_services",
          status: "running",
        }
      );

      const servicesResult = await repoAnalysisAgent.generateText(
        ctx,
        { userId: "system" },
        {
          prompt: `Based on this repository (${repositoryFullName}), suggest HTTP endpoints to monitor for uptime.

## Root Directory
${repoData.rootContents}

## File Tree
${repoData.fileTree}

## README
${repoData.readme ?? "No README found"}

## package.json
${repoData.packageJson ?? "No package.json found"}

Return a JSON array of monitors. Each monitor should have: url, name. Only suggest real, discoverable endpoints (health checks, API bases, frontend URLs). If you can't determine URLs, return an empty array.

Format: [{"url": "https://...", "name": "..."}]
Return ONLY the JSON array, no markdown.`,
        }
      );

      const monitors = parseJsonArray<{ url: string; name: string }>(
        servicesResult.text
      ).map((m) => ({ ...m, accepted: true }));

      await ctx.runMutation(
        internal.integrations.github.project_setup.updateStepStatus,
        {
          setupId: args.setupId,
          stepKey: "discover_services",
          status: "done",
          summary:
            monitors.length > 0
              ? `Found ${monitors.length} endpoints to monitor`
              : "No endpoints discovered",
        }
      );

      await ctx.runMutation(
        internal.integrations.github.project_setup.updateSetupResults,
        { setupId: args.setupId, suggestedMonitors: monitors }
      );

      // Step 3: Extract keywords
      await ctx.runMutation(
        internal.integrations.github.project_setup.updateStepStatus,
        {
          setupId: args.setupId,
          stepKey: "extract_keywords",
          status: "running",
        }
      );

      const keywordsResult = await repoAnalysisAgent.generateText(
        ctx,
        { userId: "system" },
        {
          prompt: `Extract market intelligence keywords from this repository (${repositoryFullName}).

## README
${repoData.readme ?? "No README found"}

## package.json
${repoData.packageJson ?? "No package.json found"}

Suggest keywords for monitoring mentions across Reddit, Hacker News, and the web. Include:
- Product name and variations
- Tech stack terms (e.g., "next.js saas", "convex backend")
- Product category terms (e.g., "feedback tool", "changelog software")
- Competitor names mentioned in README

Return a JSON array. Each keyword should have: keyword, category (one of: "product_name", "tech_stack", "product_category", "competitor").

Format: [{"keyword": "...", "category": "..."}]
Return ONLY the JSON array, no markdown.`,
        }
      );

      const keywords = parseJsonArray<{ keyword: string; category: string }>(
        keywordsResult.text
      ).map((k) => ({ ...k, accepted: true }));

      await ctx.runMutation(
        internal.integrations.github.project_setup.updateStepStatus,
        {
          setupId: args.setupId,
          stepKey: "extract_keywords",
          status: "done",
          summary: `Found ${keywords.length} keywords`,
        }
      );

      await ctx.runMutation(
        internal.integrations.github.project_setup.updateSetupResults,
        { setupId: args.setupId, suggestedKeywords: keywords }
      );

      // Step 4: Configure changelog
      await ctx.runMutation(
        internal.integrations.github.project_setup.updateStepStatus,
        {
          setupId: args.setupId,
          stepKey: "configure_changelog",
          status: "running",
        }
      );

      const releases = await fetchGitHubReleases(repositoryFullName);
      const hasReleases = releases.length > 0;
      const hasSemver = releases.some((r) => SEMVER_TAG_REGEX.test(r.tag_name));
      const versionPrefix = releases.find((r) => r.tag_name.startsWith("v"))
        ? "v"
        : "";

      const changelogConfig = {
        workflow: (hasReleases ? "ai_powered" : "manual") as
          | "ai_powered"
          | "automated"
          | "manual",
        importExisting: hasReleases,
        syncDirection: "reflet_first",
        versionPrefix,
        targetBranch: defaultBranch,
        releaseCount: releases.length,
        hasConventionalCommits: hasSemver,
      };

      await ctx.runMutation(
        internal.integrations.github.project_setup.updateStepStatus,
        {
          setupId: args.setupId,
          stepKey: "configure_changelog",
          status: "done",
          summary: hasReleases
            ? `${releases.length} releases found, semver ${hasSemver ? "detected" : "not detected"}`
            : "No releases found",
        }
      );

      await ctx.runMutation(
        internal.integrations.github.project_setup.updateSetupResults,
        { setupId: args.setupId, changelogConfig }
      );

      // Step 5: Suggest tags
      await ctx.runMutation(
        internal.integrations.github.project_setup.updateStepStatus,
        { setupId: args.setupId, stepKey: "suggest_tags", status: "running" }
      );

      const tagsResult = await repoAnalysisAgent.generateText(
        ctx,
        { userId: "system" },
        {
          prompt: `Suggest feedback tags for this repository (${repositoryFullName}).

## File Tree
${repoData.fileTree}

## Project Overview
${projectOverview}

Suggest 3-7 tags that represent the main areas of the codebase (e.g., "API", "Frontend", "Auth", "Performance", "Database", "UI/UX", "Mobile").

Return a JSON array. Each tag should have: name, color (hex color string).

Format: [{"name": "...", "color": "#..."}]
Return ONLY the JSON array, no markdown.`,
        }
      );

      const tags = parseJsonArray<{ name: string; color: string }>(
        tagsResult.text
      ).map((t) => ({ ...t, accepted: true }));

      await ctx.runMutation(
        internal.integrations.github.project_setup.updateStepStatus,
        {
          setupId: args.setupId,
          stepKey: "suggest_tags",
          status: "done",
          summary: `Suggested ${tags.length} tags`,
        }
      );

      await ctx.runMutation(
        internal.integrations.github.project_setup.updateSetupResults,
        { setupId: args.setupId, suggestedTags: tags }
      );

      // Step 6: Generate prompts
      await ctx.runMutation(
        internal.integrations.github.project_setup.updateStepStatus,
        {
          setupId: args.setupId,
          stepKey: "generate_prompts",
          status: "running",
        }
      );

      const promptsResult = await repoAnalysisAgent.generateText(
        ctx,
        { userId: "system" },
        {
          prompt: `Generate 4-6 personalized AI prompts for managing feedback about this project.

## Project Overview
${projectOverview}

## Tech Stack from package.json
${repoData.packageJson ?? "Unknown"}

These prompts will be used by the project owner to query their feedback data via AI. Make them specific to the project's tech stack and domain.

Return a JSON array. Each prompt should have: title (short label), prompt (the full prompt text).

Format: [{"title": "...", "prompt": "..."}]
Return ONLY the JSON array, no markdown.`,
        }
      );

      const prompts = parseJsonArray<{ title: string; prompt: string }>(
        promptsResult.text
      );

      await ctx.runMutation(
        internal.integrations.github.project_setup.updateStepStatus,
        {
          setupId: args.setupId,
          stepKey: "generate_prompts",
          status: "done",
          summary: `Generated ${prompts.length} personalized prompts`,
        }
      );

      await ctx.runMutation(
        internal.integrations.github.project_setup.updateSetupResults,
        {
          setupId: args.setupId,
          suggestedPrompts: prompts,
          status: "review",
        }
      );
    } catch (error) {
      await ctx.runMutation(
        internal.integrations.github.project_setup.updateSetupResults,
        {
          setupId: args.setupId,
          status: "error",
          error: error instanceof Error ? error.message : "Unknown error",
        }
      );
    }

    return null;
  },
});

// ============================================
// INTERNAL HELPERS
// ============================================

export const createRepoAnalysisRecord = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    connectionId: v.id("githubConnections"),
  },
  returns: v.union(v.id("repoAnalysis"), v.null()),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("repoAnalysis")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .order("desc")
      .first();

    if (
      existing &&
      (existing.status === "pending" || existing.status === "in_progress")
    ) {
      return null;
    }

    const now = Date.now();
    return await ctx.db.insert("repoAnalysis", {
      organizationId: args.organizationId,
      githubConnectionId: args.connectionId,
      status: "pending",
      createdAt: now,
      updatedAt: now,
    });
  },
});

// ============================================
// UTILITIES
// ============================================

function parseJsonArray<T>(text: string): T[] {
  try {
    // Try to extract JSON array from the text
    const jsonMatch = text.match(JSON_ARRAY_REGEX);
    if (!jsonMatch) {
      return [];
    }
    const parsed: unknown = JSON.parse(jsonMatch[0]);
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed as T[];
  } catch {
    return [];
  }
}
