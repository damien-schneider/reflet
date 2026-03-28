import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { generateObject } from "ai";
import { v } from "convex/values";
import { z } from "zod";
import { internal } from "../_generated/api";
import {
  internalAction,
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "../_generated/server";
import { buildContextPrompt } from "../ai/context";
import {
  fetchFileContent,
  searchCodeMultiQuery,
} from "../integrations/github/code_search";
import { getAuthUser } from "../shared/utils";

const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY,
});

const FEATURE_CHECK_MODEL = "anthropic/claude-sonnet-4";

// Zod schema for search term extraction
const searchTermsSchema = z.object({
  featureDescription: z
    .string()
    .describe("Concise 1-2 sentence summary of the feature being requested"),
  searchQueries: z
    .array(z.string())
    .min(3)
    .max(7)
    .describe(
      "GitHub code search queries to find this feature (function names, component names, API endpoints, etc.)"
    ),
  relevantPaths: z
    .array(z.string())
    .describe(
      "Likely file path patterns where this feature might be implemented (e.g. 'src/features/auth', 'components/checkout')"
    ),
});

// Zod schema for feature check analysis result
const featureCheckResultSchema = z.object({
  result: z.enum([
    "implemented",
    "partially_implemented",
    "not_implemented",
    "inconclusive",
  ]),
  summary: z
    .string()
    .describe("Human-readable explanation of the finding (2-4 sentences)"),
  evidence: z
    .array(
      z.object({
        filePath: z.string(),
        snippet: z.string().optional(),
        relevance: z.string().describe("Why this file is relevant"),
      })
    )
    .max(5),
  confidence: z.number().min(0).max(1).describe("Confidence score from 0 to 1"),
});

const MAX_FILES_TO_FETCH = 10;
const MAX_SEARCH_RESULTS = 15;

// ============================================
// QUERIES
// ============================================

/**
 * Get feature check status for a feedback item
 */
export const getFeatureCheckStatus = query({
  args: { feedbackId: v.id("feedback") },
  returns: v.union(
    v.null(),
    v.object({
      status: v.optional(
        v.union(
          v.literal("pending"),
          v.literal("checking"),
          v.literal("completed"),
          v.literal("error")
        )
      ),
      result: v.optional(
        v.union(
          v.literal("implemented"),
          v.literal("partially_implemented"),
          v.literal("not_implemented"),
          v.literal("inconclusive")
        )
      ),
      summary: v.optional(v.string()),
      evidence: v.optional(
        v.array(
          v.object({
            filePath: v.string(),
            snippet: v.optional(v.string()),
            relevance: v.string(),
          })
        )
      ),
      generatedAt: v.optional(v.number()),
      error: v.optional(v.string()),
    })
  ),
  handler: async (ctx, args) => {
    const feedback = await ctx.db.get(args.feedbackId);
    if (!feedback) {
      return null;
    }

    return {
      status: feedback.aiFeatureCheckStatus,
      result: feedback.aiFeatureCheckResult,
      summary: feedback.aiFeatureCheckSummary,
      evidence: feedback.aiFeatureCheckEvidence,
      generatedAt: feedback.aiFeatureCheckGeneratedAt,
      error: feedback.aiFeatureCheckError,
    };
  },
});

// ============================================
// MUTATIONS
// ============================================

/**
 * Start a feature implementation check (admin only).
 * Sets status to pending and schedules the action.
 */
export const startFeatureCheck = mutation({
  args: { feedbackId: v.id("feedback") },
  returns: v.object({ started: v.boolean() }),
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);

    const feedback = await ctx.db.get(args.feedbackId);
    if (!feedback) {
      throw new Error("Feedback not found");
    }

    // Check admin permission
    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_org_user", (q) =>
        q.eq("organizationId", feedback.organizationId).eq("userId", user._id)
      )
      .unique();

    if (!membership || membership.role === "member") {
      throw new Error("Only admins can run feature checks");
    }

    // Check if already checking
    if (
      feedback.aiFeatureCheckStatus === "pending" ||
      feedback.aiFeatureCheckStatus === "checking"
    ) {
      throw new Error("Feature check is already in progress");
    }

    // Set to pending
    await ctx.db.patch(args.feedbackId, {
      aiFeatureCheckStatus: "pending",
      aiFeatureCheckError: undefined,
      updatedAt: Date.now(),
    });

    // Schedule the action
    await ctx.scheduler.runAfter(
      0,
      internal.feedback.feature_check.runFeatureCheck,
      { feedbackId: args.feedbackId }
    );

    return { started: true };
  },
});

/**
 * Internal mutation to update feature check status
 */
export const updateFeatureCheckStatus = internalMutation({
  args: {
    feedbackId: v.id("feedback"),
    status: v.union(
      v.literal("pending"),
      v.literal("checking"),
      v.literal("completed"),
      v.literal("error")
    ),
    error: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.feedbackId, {
      aiFeatureCheckStatus: args.status,
      aiFeatureCheckError: args.error,
      updatedAt: Date.now(),
    });
    return null;
  },
});

/**
 * Internal mutation to save feature check result
 */
export const saveFeatureCheckResult = internalMutation({
  args: {
    feedbackId: v.id("feedback"),
    result: v.union(
      v.literal("implemented"),
      v.literal("partially_implemented"),
      v.literal("not_implemented"),
      v.literal("inconclusive")
    ),
    summary: v.string(),
    evidence: v.array(
      v.object({
        filePath: v.string(),
        snippet: v.optional(v.string()),
        relevance: v.string(),
      })
    ),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.feedbackId, {
      aiFeatureCheckStatus: "completed",
      aiFeatureCheckResult: args.result,
      aiFeatureCheckSummary: args.summary,
      aiFeatureCheckEvidence: args.evidence,
      aiFeatureCheckGeneratedAt: Date.now(),
      aiFeatureCheckError: undefined,
      updatedAt: Date.now(),
    });
    return null;
  },
});

// ============================================
// INTERNAL QUERIES
// ============================================

/**
 * Get feedback + organization context needed for the feature check action
 */
export const getFeedbackForFeatureCheck = internalQuery({
  args: { feedbackId: v.id("feedback") },
  handler: async (ctx, args) => {
    const feedback = await ctx.db.get(args.feedbackId);
    if (!feedback) {
      return null;
    }

    // Get GitHub connection
    const githubConnection = await ctx.db
      .query("githubConnections")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", feedback.organizationId)
      )
      .first();

    // Get tags for this feedback
    const feedbackTags = await ctx.db
      .query("feedbackTags")
      .withIndex("by_feedback", (q) => q.eq("feedbackId", args.feedbackId))
      .collect();

    const tags = await Promise.all(
      feedbackTags.map(async (ft) => {
        const tag = await ctx.db.get(ft.tagId);
        return tag?.name ?? null;
      })
    );

    // Get repo analysis
    const repoAnalysis = await ctx.db
      .query("repoAnalysis")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", feedback.organizationId)
      )
      .filter((q) => q.eq(q.field("status"), "completed"))
      .order("desc")
      .first();

    return {
      feedback: {
        _id: feedback._id,
        title: feedback.title,
        description: feedback.description,
        aiClarification: feedback.aiClarification,
        organizationId: feedback.organizationId,
      },
      tags: tags.filter(Boolean),
      githubConnection: githubConnection
        ? {
            installationId: githubConnection.installationId,
            repositoryFullName: githubConnection.repositoryFullName,
          }
        : null,
      repoAnalysis: repoAnalysis
        ? {
            summary: repoAnalysis.summary,
            techStack: repoAnalysis.techStack,
            architecture: repoAnalysis.architecture,
            features: repoAnalysis.features,
          }
        : null,
    };
  },
});

// ============================================
// ACTIONS
// ============================================

/**
 * Run the feature implementation check.
 * 1. Gather context (feedback, org, GitHub connection)
 * 2. Extract search terms via AI
 * 3. Search codebase via GitHub Code Search API
 * 4. Fetch relevant file contents
 * 5. AI analysis for verdict
 * 6. Save results
 */
export const runFeatureCheck = internalAction({
  args: { feedbackId: v.id("feedback") },
  returns: v.null(),
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
        repository: repo,
        repoAnalysis: repoAnalysis ?? null,
        websiteReferences: [],
      });

      // 3. Extract search terms via AI
      const { object: searchTerms } = await generateObject({
        model: openrouter(FEATURE_CHECK_MODEL),
        schema: searchTermsSchema,
        system: `You are analyzing a feature request to determine what to search for in a codebase. Generate targeted GitHub code search queries that would find the implementation of this feature if it exists.

Focus on:
- Specific function/component/class names that would implement this feature
- API endpoint patterns
- Database model or schema fields
- UI component names
- Configuration or feature flag names

${contextPrompt}`,
        prompt: `Feature request:
Title: ${feedback.title}
Description: ${feedback.description ?? "(no description)"}
${feedback.aiClarification ? `AI Clarification: ${feedback.aiClarification}` : ""}
${tags.length > 0 ? `Tags: ${tags.join(", ")}` : ""}

Generate search queries to find if this feature is already implemented in the codebase.`,
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
        schema: featureCheckResultSchema,
        system: `You are analyzing a codebase to determine if a requested feature is already implemented.

Your task:
- Determine if the feature described in the request already exists in the codebase
- Provide evidence from the actual code you see
- Be precise — "implemented" means the feature is fully functional, "partially_implemented" means some aspects exist but it's incomplete
- "not_implemented" means no evidence found in the code
- "inconclusive" means the search results are ambiguous

${contextPrompt}`,
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
      });

      // 7. Save results
      await ctx.runMutation(
        internal.feedback.feature_check.saveFeatureCheckResult,
        {
          feedbackId: args.feedbackId,
          result: analysis.result,
          summary: analysis.summary,
          evidence: analysis.evidence.map((e) => ({
            filePath: e.filePath,
            snippet: e.snippet,
            relevance: e.relevance,
          })),
        }
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unknown error occurred";
      await ctx.runMutation(
        internal.feedback.feature_check.updateFeatureCheckStatus,
        {
          feedbackId: args.feedbackId,
          status: "error",
          error: message,
        }
      );
    }

    return null;
  },
});
