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
  returns: v.union(
    v.object({
      _creationTime: v.number(),
      _id: v.id("projectSetupResults"),
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
    }),
    v.null()
  ),
});

export const getSetupStatus = query({
  args: { organizationId: v.id("organizations") },
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

// ============================================
// INTERNAL QUERIES
// ============================================

export const getConnectionForSetup = internalQuery({
  args: { organizationId: v.id("organizations") },
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
      defaultBranch: connection.repositoryDefaultBranch ?? "main",
      installationId: connection.installationId,
      repositoryFullName: connection.repositoryFullName,
    };
  },
  returns: v.union(
    v.object({
      connectionId: v.id("githubConnections"),
      defaultBranch: v.string(),
      installationId: v.string(),
      repositoryFullName: v.string(),
    }),
    v.null()
  ),
});

// ============================================
// MUTATIONS
// ============================================

export const startProjectSetup = mutation({
  args: { organizationId: v.id("organizations") },
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
      internal.integrations.github.project_setup.runProjectSetup,
      { organizationId: args.organizationId, setupId }
    );

    return setupId;
  },
  returns: v.id("projectSetupResults"),
});

export const updateStepStatus = internalMutation({
  args: {
    error: v.optional(v.string()),
    setupId: v.id("projectSetupResults"),
    status: v.union(
      v.literal("pending"),
      v.literal("running"),
      v.literal("done"),
      v.literal("error")
    ),
    stepKey: v.string(),
    summary: v.optional(v.string()),
  },
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
        error: args.error ?? step.error,
        status: args.status,
        summary: args.summary ?? step.summary,
      };
    });

    await ctx.db.patch(args.setupId, {
      steps: updatedSteps,
      updatedAt: Date.now(),
    });

    return null;
  },
  returns: v.null(),
});

export const updateSetupResults = internalMutation({
  args: {
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
    error: v.optional(v.string()),
    projectOverview: v.optional(v.string()),
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
  },
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
  returns: v.null(),
});

export const applySetupResults = mutation({
  args: {
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
    acceptedMonitors: v.array(
      v.object({
        name: v.string(),
        url: v.string(),
      })
    ),
    acceptedTags: v.array(
      v.object({
        color: v.string(),
        name: v.string(),
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
    organizationId: v.id("organizations"),
    setupId: v.id("projectSetupResults"),
  },
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
        alertThreshold: 3,
        checkIntervalMinutes: 5,
        consecutiveFailures: 0,
        createdAt: now,
        isPublic: true,
        name: monitor.name,
        organizationId: args.organizationId,
        status: "operational",
        updatedAt: now,
        url: monitor.url,
      });
    }

    // Create keywords
    for (const keyword of args.acceptedKeywords) {
      await ctx.db.insert("intelligenceKeywords", {
        createdAt: now,
        keyword: keyword.keyword,
        organizationId: args.organizationId,
        source: keyword.source,
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
        color: tag.color,
        createdAt: now,
        isDoneStatus: false,
        isRoadmapLane: false,
        name: tag.name,
        organizationId: args.organizationId,
        slug,
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

    // Mark setup as completed
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
  returns: v.null(),
});

// ============================================
// ACTIONS
// ============================================

export const runProjectSetup = internalAction({
  args: {
    organizationId: v.id("organizations"),
    setupId: v.id("projectSetupResults"),
  },
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
          status: "running",
          stepKey: "analyze_codebase",
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
            connectionId: connection.connectionId,
            organizationId: args.organizationId,
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
          status: "done",
          stepKey: "analyze_codebase",
          summary: projectOverview.slice(0, 200),
        }
      );

      await ctx.runMutation(
        internal.integrations.github.project_setup.updateSetupResults,
        { projectOverview, setupId: args.setupId }
      );

      // Step 2: Discover services
      await ctx.runMutation(
        internal.integrations.github.project_setup.updateStepStatus,
        {
          setupId: args.setupId,
          status: "running",
          stepKey: "discover_services",
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
          status: "done",
          stepKey: "discover_services",
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
          status: "running",
          stepKey: "extract_keywords",
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
          status: "done",
          stepKey: "extract_keywords",
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
          status: "running",
          stepKey: "configure_changelog",
        }
      );

      const releases = await fetchGitHubReleases(repositoryFullName);
      const hasReleases = releases.length > 0;
      const hasSemver = releases.some((r) => SEMVER_TAG_REGEX.test(r.tag_name));
      const versionPrefix = releases.find((r) => r.tag_name.startsWith("v"))
        ? "v"
        : "";

      const changelogConfig = {
        hasConventionalCommits: hasSemver,
        importExisting: hasReleases,
        releaseCount: releases.length,
        syncDirection: "reflet_first",
        targetBranch: defaultBranch,
        versionPrefix,
        workflow: (hasReleases ? "ai_powered" : "manual") as
          | "ai_powered"
          | "automated"
          | "manual",
      };

      await ctx.runMutation(
        internal.integrations.github.project_setup.updateStepStatus,
        {
          setupId: args.setupId,
          status: "done",
          stepKey: "configure_changelog",
          summary: hasReleases
            ? `${releases.length} releases found, semver ${hasSemver ? "detected" : "not detected"}`
            : "No releases found",
        }
      );

      await ctx.runMutation(
        internal.integrations.github.project_setup.updateSetupResults,
        { changelogConfig, setupId: args.setupId }
      );

      // Step 5: Suggest tags
      await ctx.runMutation(
        internal.integrations.github.project_setup.updateStepStatus,
        { setupId: args.setupId, status: "running", stepKey: "suggest_tags" }
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
          status: "done",
          stepKey: "suggest_tags",
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
          status: "running",
          stepKey: "generate_prompts",
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
          status: "done",
          stepKey: "generate_prompts",
          summary: `Generated ${prompts.length} personalized prompts`,
        }
      );

      await ctx.runMutation(
        internal.integrations.github.project_setup.updateSetupResults,
        {
          setupId: args.setupId,
          status: "review",
          suggestedPrompts: prompts,
        }
      );
    } catch (error) {
      await ctx.runMutation(
        internal.integrations.github.project_setup.updateSetupResults,
        {
          error: error instanceof Error ? error.message : "Unknown error",
          setupId: args.setupId,
          status: "error",
        }
      );
    }

    return null;
  },
  returns: v.null(),
});

// ============================================
// INTERNAL HELPERS
// ============================================

export const createRepoAnalysisRecord = internalMutation({
  args: {
    connectionId: v.id("githubConnections"),
    organizationId: v.id("organizations"),
  },
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
      createdAt: now,
      githubConnectionId: args.connectionId,
      organizationId: args.organizationId,
      status: "pending",
      updatedAt: now,
    });
  },
  returns: v.union(v.id("repoAnalysis"), v.null()),
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
