import { v } from "convex/values";
import { internal } from "../../_generated/api";
import { internalAction } from "../../_generated/server";
import { repoAnalysisAgent } from "../../ai/agent";
import { fetchGitHubReleases, fetchRepoData } from "./github_helpers";
import { parseJsonArray, SEMVER_TAG_REGEX } from "./project_setup_shared";

export const runProjectSetup = internalAction({
  args: {
    setupId: v.id("projectSetupResults"),
    organizationId: v.id("organizations"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    try {
      const connection = await ctx.runQuery(
        internal.integrations.github.project_setup_queries
          .getConnectionForSetup,
        { organizationId: args.organizationId }
      );

      if (!connection) {
        throw new Error("No GitHub connection found");
      }

      const { repositoryFullName, defaultBranch } = connection;

      // Step 1: Analyze codebase
      await ctx.runMutation(
        internal.integrations.github.project_setup_mutations.updateStepStatus,
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
        const analysisId = await ctx.runMutation(
          internal.integrations.github.project_setup_mutations
            .createRepoAnalysisRecord,
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
        internal.integrations.github.project_setup_mutations.updateStepStatus,
        {
          setupId: args.setupId,
          stepKey: "analyze_codebase",
          status: "done",
          summary: projectOverview.slice(0, 200),
        }
      );

      await ctx.runMutation(
        internal.integrations.github.project_setup_mutations.updateSetupResults,
        { setupId: args.setupId, projectOverview }
      );

      // Step 2: Discover services
      await ctx.runMutation(
        internal.integrations.github.project_setup_mutations.updateStepStatus,
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
        internal.integrations.github.project_setup_mutations.updateStepStatus,
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
        internal.integrations.github.project_setup_mutations.updateSetupResults,
        { setupId: args.setupId, suggestedMonitors: monitors }
      );

      // Step 3: Extract keywords
      await ctx.runMutation(
        internal.integrations.github.project_setup_mutations.updateStepStatus,
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
        internal.integrations.github.project_setup_mutations.updateStepStatus,
        {
          setupId: args.setupId,
          stepKey: "extract_keywords",
          status: "done",
          summary: `Found ${keywords.length} keywords`,
        }
      );

      await ctx.runMutation(
        internal.integrations.github.project_setup_mutations.updateSetupResults,
        { setupId: args.setupId, suggestedKeywords: keywords }
      );

      // Step 4: Configure changelog
      await ctx.runMutation(
        internal.integrations.github.project_setup_mutations.updateStepStatus,
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
        internal.integrations.github.project_setup_mutations.updateStepStatus,
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
        internal.integrations.github.project_setup_mutations.updateSetupResults,
        { setupId: args.setupId, changelogConfig }
      );

      // Step 5: Suggest tags
      await ctx.runMutation(
        internal.integrations.github.project_setup_mutations.updateStepStatus,
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
        internal.integrations.github.project_setup_mutations.updateStepStatus,
        {
          setupId: args.setupId,
          stepKey: "suggest_tags",
          status: "done",
          summary: `Suggested ${tags.length} tags`,
        }
      );

      await ctx.runMutation(
        internal.integrations.github.project_setup_mutations.updateSetupResults,
        { setupId: args.setupId, suggestedTags: tags }
      );

      // Step 6: Generate prompts
      await ctx.runMutation(
        internal.integrations.github.project_setup_mutations.updateStepStatus,
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
        internal.integrations.github.project_setup_mutations.updateStepStatus,
        {
          setupId: args.setupId,
          stepKey: "generate_prompts",
          status: "done",
          summary: `Generated ${prompts.length} personalized prompts`,
        }
      );

      await ctx.runMutation(
        internal.integrations.github.project_setup_mutations.updateSetupResults,
        {
          setupId: args.setupId,
          suggestedPrompts: prompts,
          status: "review",
        }
      );
    } catch (error) {
      await ctx.runMutation(
        internal.integrations.github.project_setup_mutations.updateSetupResults,
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
