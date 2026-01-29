import { v } from "convex/values";
import { internal } from "./_generated/api";
import {
  internalAction,
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "./_generated/server";
import { repoAnalysisAgent } from "./agent";
import { getAuthUser } from "./utils";

// ============================================
// QUERIES
// ============================================

/**
 * Get the latest repo analysis for an organization
 */
export const getLatestAnalysis = query({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);

    // Verify membership
    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_org_user", (q) =>
        q.eq("organizationId", args.organizationId).eq("userId", user._id)
      )
      .unique();

    if (!membership) {
      return null;
    }

    const analysis = await ctx.db
      .query("repoAnalysis")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .order("desc")
      .first();

    return analysis;
  },
});

/**
 * Internal query to get GitHub connection for analysis
 */
export const getConnectionForAnalysis = internalQuery({
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
      installationId: connection.installationId,
      repositoryFullName: connection.repositoryFullName,
    };
  },
});

// ============================================
// MUTATIONS
// ============================================

/**
 * Update a section of the repository analysis (admin only)
 */
export const updateAnalysisSection = mutation({
  args: {
    organizationId: v.id("organizations"),
    field: v.union(
      v.literal("summary"),
      v.literal("techStack"),
      v.literal("architecture"),
      v.literal("features"),
      v.literal("repoStructure")
    ),
    value: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);

    // Check admin permission
    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_org_user", (q) =>
        q.eq("organizationId", args.organizationId).eq("userId", user._id)
      )
      .unique();

    if (!membership || membership.role === "member") {
      throw new Error("Only admins can edit repository analysis");
    }

    // Get the latest analysis
    const analysis = await ctx.db
      .query("repoAnalysis")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .order("desc")
      .first();

    if (!analysis) {
      throw new Error("No analysis found");
    }

    // Update the specific field
    await ctx.db.patch(analysis._id, {
      [args.field]: args.value,
      updatedAt: Date.now(),
    });

    return analysis._id;
  },
});

/**
 * Start a new repository analysis (admin only)
 */
export const startAnalysis = mutation({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);

    // Check admin permission
    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_org_user", (q) =>
        q.eq("organizationId", args.organizationId).eq("userId", user._id)
      )
      .unique();

    if (!membership || membership.role === "member") {
      throw new Error("Only admins can run repository analysis");
    }

    // Check for GitHub connection
    const connection = await ctx.db
      .query("githubConnections")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .first();

    if (!connection?.repositoryId) {
      throw new Error("No GitHub repository connected");
    }

    // Check if there's already an analysis in progress
    const existingAnalysis = await ctx.db
      .query("repoAnalysis")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .order("desc")
      .first();

    if (
      existingAnalysis &&
      (existingAnalysis.status === "pending" ||
        existingAnalysis.status === "in_progress")
    ) {
      throw new Error("An analysis is already in progress");
    }

    const now = Date.now();

    // Create new analysis record
    const analysisId = await ctx.db.insert("repoAnalysis", {
      organizationId: args.organizationId,
      githubConnectionId: connection._id,
      status: "pending",
      createdAt: now,
      updatedAt: now,
    });

    // Schedule the analysis action
    await ctx.scheduler.runAfter(0, internal.repo_analysis.runAnalysis, {
      analysisId,
      organizationId: args.organizationId,
    });

    return analysisId;
  },
});

/**
 * Internal mutation to update analysis status
 */
export const updateAnalysisStatus = internalMutation({
  args: {
    analysisId: v.id("repoAnalysis"),
    status: v.union(
      v.literal("pending"),
      v.literal("in_progress"),
      v.literal("completed"),
      v.literal("error")
    ),
    error: v.optional(v.string()),
    summary: v.optional(v.string()),
    techStack: v.optional(v.string()),
    architecture: v.optional(v.string()),
    features: v.optional(v.string()),
    repoStructure: v.optional(v.string()),
    threadId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { analysisId, status, ...updates } = args;
    const now = Date.now();

    await ctx.db.patch(analysisId, {
      status,
      ...updates,
      updatedAt: now,
      ...(status === "completed" || status === "error"
        ? { completedAt: now }
        : {}),
    });
  },
});

// ============================================
// HELPERS
// ============================================

/**
 * Fetch repository data from GitHub API
 */
async function fetchRepoData(repositoryFullName: string): Promise<{
  rootContents: string;
  fileTree: string;
  readme: string | null;
  packageJson: string | null;
}> {
  const headers = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };

  // Fetch root directory contents
  let rootContents = "";
  try {
    const rootResponse = await fetch(
      `https://api.github.com/repos/${repositoryFullName}/contents/`,
      { headers }
    );
    if (rootResponse.ok) {
      const rootData = await rootResponse.json();
      if (Array.isArray(rootData)) {
        rootContents = rootData
          .map(
            (item: { name: string; type: string }) =>
              `${item.type === "dir" ? "[dir]" : "[file]"} ${item.name}`
          )
          .join("\n");
      }
    }
  } catch {
    rootContents = "Failed to fetch root contents";
  }

  // Fetch file tree
  let fileTree = "";
  try {
    const treeResponse = await fetch(
      `https://api.github.com/repos/${repositoryFullName}/git/trees/HEAD?recursive=1`,
      { headers }
    );
    if (treeResponse.ok) {
      const treeData = await treeResponse.json();
      const tree = treeData.tree || [];
      const limitedTree = tree.slice(0, 100);
      fileTree = limitedTree
        .map((item: { path: string; type: string }) => item.path)
        .join("\n");
      if (tree.length > 100) {
        fileTree += `\n... and ${tree.length - 100} more files`;
      }
    }
  } catch {
    fileTree = "Failed to fetch file tree";
  }

  // Fetch README
  let readme: string | null = null;
  try {
    const readmeResponse = await fetch(
      `https://api.github.com/repos/${repositoryFullName}/readme`,
      { headers }
    );
    if (readmeResponse.ok) {
      const readmeData = await readmeResponse.json();
      if (readmeData.content) {
        readme = Buffer.from(readmeData.content, "base64").toString("utf-8");
        if (readme.length > 5000) {
          readme = `${readme.slice(0, 5000)}\n...[truncated]`;
        }
      }
    }
  } catch {
    readme = null;
  }

  // Fetch package.json
  let packageJson: string | null = null;
  try {
    const pkgResponse = await fetch(
      `https://api.github.com/repos/${repositoryFullName}/contents/package.json`,
      { headers }
    );
    if (pkgResponse.ok) {
      const pkgData = await pkgResponse.json();
      if (pkgData.content) {
        packageJson = Buffer.from(pkgData.content, "base64").toString("utf-8");
      }
    }
  } catch {
    packageJson = null;
  }

  return { rootContents, fileTree, readme, packageJson };
}

// ============================================
// ACTIONS
// ============================================

/**
 * Run the repository analysis using the agent
 */
export const runAnalysis = internalAction({
  args: {
    analysisId: v.id("repoAnalysis"),
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    // Update status to in_progress
    await ctx.runMutation(internal.repo_analysis.updateAnalysisStatus, {
      analysisId: args.analysisId,
      status: "in_progress",
    });

    try {
      // Get connection info
      const connection = await ctx.runQuery(
        internal.repo_analysis.getConnectionForAnalysis,
        { organizationId: args.organizationId }
      );

      if (!connection) {
        throw new Error("No GitHub connection found");
      }

      const { repositoryFullName } = connection;

      // Fetch repo data first
      const repoData = await fetchRepoData(repositoryFullName);

      // Generate analysis using the agent
      const result = await repoAnalysisAgent.generateText(
        ctx,
        { userId: "system" },
        {
          prompt: `Please analyze the following GitHub repository: ${repositoryFullName}

Here is the repository data:

## Root Directory Contents
${repoData.rootContents}

## Repository Structure (files and folders)
${repoData.fileTree}

## README Content
${repoData.readme || "No README found"}

## Package/Config Files
${repoData.packageJson || "No package.json found"}

Based on this information, provide a comprehensive analysis with:

**Summary**: A brief overview of what this project does (2-3 sentences)

**Tech Stack**: List the main technologies, frameworks, and libraries used

**Architecture**: Describe the overall structure and design patterns

**Features**: Key features and capabilities of the project

**Repository Structure**: A brief description of how the codebase is organized

Format each section clearly with the headers above.`,
        }
      );

      // Parse the response into sections
      const sections = parseAnalysisResponse(result.text);

      // Save the analysis results
      await ctx.runMutation(internal.repo_analysis.updateAnalysisStatus, {
        analysisId: args.analysisId,
        status: "completed",
        summary: sections.summary,
        techStack: sections.techStack,
        architecture: sections.architecture,
        features: sections.features,
        repoStructure: sections.repoStructure,
      });
    } catch (error) {
      await ctx.runMutation(internal.repo_analysis.updateAnalysisStatus, {
        analysisId: args.analysisId,
        status: "error",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  },
});

// Top-level regex patterns for parsing analysis response
const ANALYSIS_PATTERNS = [
  /\*\*Summary\*\*:?\s*([\s\S]*?)(?=\*\*Tech Stack\*\*|\*\*Architecture\*\*|\*\*Features\*\*|\*\*Repository Structure\*\*|##|\n\n\*\*|$)/i,
  /\*\*Tech Stack\*\*:?\s*([\s\S]*?)(?=\*\*Summary\*\*|\*\*Architecture\*\*|\*\*Features\*\*|\*\*Repository Structure\*\*|##|\n\n\*\*|$)/i,
  /\*\*Architecture\*\*:?\s*([\s\S]*?)(?=\*\*Summary\*\*|\*\*Tech Stack\*\*|\*\*Features\*\*|\*\*Repository Structure\*\*|##|\n\n\*\*|$)/i,
  /\*\*Features\*\*:?\s*([\s\S]*?)(?=\*\*Summary\*\*|\*\*Tech Stack\*\*|\*\*Architecture\*\*|\*\*Repository Structure\*\*|##|\n\n\*\*|$)/i,
  /\*\*Repository Structure\*\*:?\s*([\s\S]*?)(?=\*\*Summary\*\*|\*\*Tech Stack\*\*|\*\*Architecture\*\*|\*\*Features\*\*|##|\n\n\*\*|$)/i,
];

const ANALYSIS_KEYS = [
  "summary",
  "techStack",
  "architecture",
  "features",
  "repoStructure",
];

/**
 * Parse the analysis response into sections
 */
function parseAnalysisResponse(response: string): {
  summary?: string;
  techStack?: string;
  architecture?: string;
  features?: string;
  repoStructure?: string;
} {
  const sections: Record<string, string> = {};

  for (const [index, pattern] of ANALYSIS_PATTERNS.entries()) {
    const match = response.match(pattern);
    if (match?.[1]) {
      sections[ANALYSIS_KEYS[index]] = match[1].trim();
    }
  }

  // If parsing failed, store the whole response as summary
  if (Object.keys(sections).length === 0) {
    sections.summary = response.trim();
  }

  return sections;
}
