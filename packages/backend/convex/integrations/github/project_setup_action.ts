"use node";

import { v } from "convex/values";
import { internal } from "../../_generated/api";
import { internalAction } from "../../_generated/server";
import { repoAnalysisAgent } from "../../ai/agent";
import { fetchGitHubReleases, fetchRepoData } from "./github_helpers";

const JSON_ARRAY_REGEX = /\[[\s\S]*\]/;
const SEMVER_TAG_REGEX = /^v?\d+\.\d+/;

function parseJsonArray<T>(text: string): T[] {
  try {
    const jsonMatch = text.match(JSON_ARRAY_REGEX);
    if (!jsonMatch) {
      return [];
    }
    const parsed: unknown = JSON.parse(jsonMatch[0]);
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
}

export const runProjectSetup = internalAction({
  args: {
    organizationId: v.id("organizations"),
    setupId: v.id("projectSetupResults"),
  },
  handler: async (ctx, args) => {
    try {
      const connection = await ctx.runQuery(
        internal.integrations.github.project_setup_internal
          .getConnectionForSetup,
        { organizationId: args.organizationId }
      );

      if (!connection) {
        throw new Error("No GitHub connection found");
      }

      const { repositoryFullName, defaultBranch } = connection;

      // Step 1: Analyze codebase
      await ctx.runMutation(
        internal.integrations.github.project_setup_internal.updateStepStatus,
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
          internal.integrations.github.project_setup_internal
            .createRepoAnalysisRecord,
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
        internal.integrations.github.project_setup_internal.updateStepStatus,
        {
          setupId: args.setupId,
          status: "done",
          stepKey: "analyze_codebase",
          summary: projectOverview.slice(0, 200),
        }
      );

      await ctx.runMutation(
        internal.integrations.github.project_setup_internal.updateSetupResults,
        { projectOverview, setupId: args.setupId }
      );

      // Step 2: Discover services
      await ctx.runMutation(
        internal.integrations.github.project_setup_internal.updateStepStatus,
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
        internal.integrations.github.project_setup_internal.updateStepStatus,
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
        internal.integrations.github.project_setup_internal.updateSetupResults,
        { setupId: args.setupId, suggestedMonitors: monitors }
      );

      // Step 3: Extract keywords
      await ctx.runMutation(
        internal.integrations.github.project_setup_internal.updateStepStatus,
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
        internal.integrations.github.project_setup_internal.updateStepStatus,
        {
          setupId: args.setupId,
          status: "done",
          stepKey: "extract_keywords",
          summary: `Found ${keywords.length} keywords`,
        }
      );

      await ctx.runMutation(
        internal.integrations.github.project_setup_internal.updateSetupResults,
        { setupId: args.setupId, suggestedKeywords: keywords }
      );

      // Step 4: Configure changelog
      await ctx.runMutation(
        internal.integrations.github.project_setup_internal.updateStepStatus,
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
        internal.integrations.github.project_setup_internal.updateStepStatus,
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
        internal.integrations.github.project_setup_internal.updateSetupResults,
        { changelogConfig, setupId: args.setupId }
      );

      // Step 5: Suggest tags
      await ctx.runMutation(
        internal.integrations.github.project_setup_internal.updateStepStatus,
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
        internal.integrations.github.project_setup_internal.updateStepStatus,
        {
          setupId: args.setupId,
          status: "done",
          stepKey: "suggest_tags",
          summary: `Suggested ${tags.length} tags`,
        }
      );

      await ctx.runMutation(
        internal.integrations.github.project_setup_internal.updateSetupResults,
        { setupId: args.setupId, suggestedTags: tags }
      );

      // Step 6: Generate prompts
      await ctx.runMutation(
        internal.integrations.github.project_setup_internal.updateStepStatus,
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
        internal.integrations.github.project_setup_internal.updateStepStatus,
        {
          setupId: args.setupId,
          status: "done",
          stepKey: "generate_prompts",
          summary: `Generated ${prompts.length} personalized prompts`,
        }
      );

      await ctx.runMutation(
        internal.integrations.github.project_setup_internal.updateSetupResults,
        {
          setupId: args.setupId,
          status: "review",
          suggestedPrompts: prompts,
        }
      );
    } catch (error) {
      await ctx.runMutation(
        internal.integrations.github.project_setup_internal.updateSetupResults,
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
