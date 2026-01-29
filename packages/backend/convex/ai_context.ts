import { v } from "convex/values";
import { internalQuery } from "./_generated/server";

/**
 * Get aggregated AI context for an organization
 * Used by feedback clarification and other AI features
 */
export const getOrganizationContext = internalQuery({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    // Get organization info
    const org = await ctx.db.get(args.organizationId);

    // Get latest completed repo analysis
    const repoAnalysis = await ctx.db
      .query("repoAnalysis")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .filter((q) => q.eq(q.field("status"), "completed"))
      .order("desc")
      .first();

    // Get successful website references
    const websiteRefs = await ctx.db
      .query("websiteReferences")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .filter((q) => q.eq(q.field("status"), "success"))
      .collect();

    // Get GitHub connection info
    const githubConnection = await ctx.db
      .query("githubConnections")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .first();

    return {
      organization: org
        ? {
            name: org.name,
            slug: org.slug,
          }
        : null,
      repository: githubConnection?.repositoryFullName || null,
      repoAnalysis: repoAnalysis
        ? {
            summary: repoAnalysis.summary,
            techStack: repoAnalysis.techStack,
            architecture: repoAnalysis.architecture,
            features: repoAnalysis.features,
          }
        : null,
      websiteReferences: websiteRefs.map((ref) => ({
        url: ref.url,
        title: ref.title,
        description: ref.description,
        content: ref.scrapedContent,
      })),
    };
  },
});

/**
 * Build a context string from the organization context
 */
export function buildContextPrompt(context: {
  organization: { name: string; slug: string } | null;
  repository: string | null;
  repoAnalysis: {
    summary?: string;
    techStack?: string;
    architecture?: string;
    features?: string;
  } | null;
  websiteReferences: Array<{
    url: string;
    title?: string;
    description?: string;
    content?: string;
  }>;
}): string {
  const parts: string[] = [];

  if (context.organization) {
    parts.push(`Organization: ${context.organization.name}`);
  }

  if (context.repository) {
    parts.push(`GitHub Repository: ${context.repository}`);
  }

  if (context.repoAnalysis) {
    const analysisLines: string[] = [];
    if (context.repoAnalysis.summary) {
      analysisLines.push(`Summary: ${context.repoAnalysis.summary}`);
    }
    if (context.repoAnalysis.techStack) {
      analysisLines.push(`Tech Stack: ${context.repoAnalysis.techStack}`);
    }
    if (context.repoAnalysis.architecture) {
      analysisLines.push(`Architecture: ${context.repoAnalysis.architecture}`);
    }
    if (context.repoAnalysis.features) {
      analysisLines.push(`Features: ${context.repoAnalysis.features}`);
    }
    if (analysisLines.length > 0) {
      parts.push(`\nProject Analysis:\n${analysisLines.join("\n")}`);
    }
  }

  if (context.websiteReferences.length > 0) {
    const refLines = context.websiteReferences.map((ref) => {
      let line = `- ${ref.url}`;
      if (ref.title) {
        line += `: ${ref.title}`;
      }
      if (ref.description) {
        line += ` - ${ref.description}`;
      }
      return line;
    });
    parts.push(`\nRelated Documentation:\n${refLines.join("\n")}`);
  }

  return parts.join("\n");
}
