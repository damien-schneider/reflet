import { generateObject } from "ai";
import { v } from "convex/values";
import { internal } from "../_generated/api";
import { internalAction } from "../_generated/server";
import { buildContextPrompt } from "../ai/context";
import {
  fetchFileContent,
  searchCodeMultiQuery,
} from "../integrations/github/code_search";
import {
  FEATURE_CHECK_MODEL,
  featureCheckResultSchema,
  MAX_FILES_TO_FETCH,
  MAX_SEARCH_RESULTS,
  openrouter,
  searchTermsSchema,
} from "./feature_check_model";

export const runFeatureCheck = internalAction({
  args: { feedbackId: v.id("feedback") },
  handler: async (ctx, args) => {
    // Update status to checking
    await ctx.runMutation(
      internal.feedback.feature_check.updateFeatureCheckStatus,
      { feedbackId: args.feedbackId, status: "checking" }
    );

    try {
      // 1. Gather context
      const data = await ctx.runQuery(
        internal.feedback.feature_check.getFeedbackForFeatureCheck,
        { feedbackId: args.feedbackId }
      );

      if (!data?.feedback) {
        throw new Error("Feedback not found");
      }

      if (!data.githubConnection?.repositoryFullName) {
        throw new Error(
          "No GitHub repository connected. Please connect a GitHub repository in Settings > GitHub."
        );
      }

      if (!data.githubConnection.installationId) {
        throw new Error("GitHub App installation not found");
      }

      // 2. Get installation token
      const { token } = await ctx.runAction(
        internal.integrations.github.node_actions.getInstallationTokenInternal,
        { installationId: data.githubConnection.installationId }
      );

      const repo = data.githubConnection.repositoryFullName;
      const { feedback, tags, repoAnalysis } = data;

      // Build context for AI
      const contextPrompt = buildContextPrompt({
        organization: null,
        repoAnalysis: repoAnalysis ?? null,
        repository: repo,
        websiteReferences: [],
      });

      // 3. Extract search terms via AI
      const { object: searchTerms } = await generateObject({
        model: openrouter(FEATURE_CHECK_MODEL),
        prompt: `Feature request:
Title: ${feedback.title}
Description: ${feedback.description ?? "(no description)"}
${feedback.aiClarification ? `AI Clarification: ${feedback.aiClarification}` : ""}
${tags.length > 0 ? `Tags: ${tags.join(", ")}` : ""}

Generate search queries to find if this feature is already implemented in the codebase.`,
        schema: searchTermsSchema,
        system: `You are analyzing a feature request to determine what to search for in a codebase. Generate targeted GitHub code search queries that would find the implementation of this feature if it exists.

Focus on:
- Specific function/component/class names that would implement this feature
- API endpoint patterns
- Database model or schema fields
- UI component names
- Configuration or feature flag names

${contextPrompt}`,
      });

      // 4. Search codebase
      const searchResults = await searchCodeMultiQuery(
        token,
        repo,
        searchTerms.searchQueries
      );

      const topResults = searchResults.slice(0, MAX_SEARCH_RESULTS);

      // 5. Fetch file contents for the most relevant files
      const filesToFetch = topResults.slice(0, MAX_FILES_TO_FETCH);
      const fileContents = await Promise.all(
        filesToFetch.map((result) =>
          fetchFileContent(token, repo, result.filePath)
        )
      );

      const validContents = fileContents.filter(
        (f): f is NonNullable<typeof f> => f !== null
      );

      // 6. AI Analysis
      const filesContext = validContents
        .map(
          (f) =>
            `### ${f.filePath}${f.truncated ? " (truncated)" : ""}\n\`\`\`\n${f.content}\n\`\`\``
        )
        .join("\n\n");

      const searchResultsContext = topResults
        .map((r) => {
          const fragments =
            r.matchedFragments.length > 0
              ? `\n  Matches: ${r.matchedFragments.slice(0, 3).join(" | ")}`
              : "";
          return `- ${r.filePath}${fragments}`;
        })
        .join("\n");

      const { object: analysis } = await generateObject({
        model: openrouter(FEATURE_CHECK_MODEL),
        prompt: `## Feature Request
Title: ${feedback.title}
Description: ${feedback.description ?? "(no description)"}
${feedback.aiClarification ? `AI Clarification: ${feedback.aiClarification}` : ""}
${searchTerms.featureDescription ? `Feature Summary: ${searchTerms.featureDescription}` : ""}

## Search Results (${topResults.length} files found)
${searchResultsContext || "No matching files found in the codebase."}

## File Contents
${filesContext || "No file contents available."}

Analyze whether this feature is already implemented based on the code above.`,
        schema: featureCheckResultSchema,
        system: `You are analyzing a codebase to determine if a requested feature is already implemented.

Your task:
- Determine if the feature described in the request already exists in the codebase
- Provide evidence from the actual code you see
- Be precise — "implemented" means the feature is fully functional, "partially_implemented" means some aspects exist but it's incomplete
- "not_implemented" means no evidence found in the code
- "inconclusive" means the search results are ambiguous

${contextPrompt}`,
      });

      // 7. Save results
      await ctx.runMutation(
        internal.feedback.feature_check.saveFeatureCheckResult,
        {
          evidence: analysis.evidence.map((e) => ({
            filePath: e.filePath,
            relevance: e.relevance,
            snippet: e.snippet,
          })),
          feedbackId: args.feedbackId,
          result: analysis.result,
          summary: analysis.summary,
        }
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unknown error occurred";
      await ctx.runMutation(
        internal.feedback.feature_check.updateFeatureCheckStatus,
        {
          error: message,
          feedbackId: args.feedbackId,
          status: "error",
        }
      );
    }

    return null;
  },
  returns: v.null(),
});
