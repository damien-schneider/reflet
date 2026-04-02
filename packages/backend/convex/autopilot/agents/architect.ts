/**
 * Architect Agent — Phase 3.5
 *
 * Performs code quality and architectural analysis including:
 *   - File length and complexity assessment
 *   - Function cognitive complexity detection
 *   - Nesting depth analysis
 *   - Code duplication detection
 *   - Type safety evaluation
 *   - Barrel file identification
 *   - Test coverage assessment
 *   - Naming convention compliance
 *   - AGENTS.md coding standards adherence
 *
 * Creates autopilot tasks for auto-fixable violations and
 * architect findings in the inbox for significant issues.
 */

import { v } from "convex/values";
import { z } from "zod";
import { internal } from "../../_generated/api";
import { internalAction } from "../../_generated/server";
import { MODELS } from "./models";
import { generateObjectWithFallback } from "./shared";

const ARCHITECT_MODELS = [MODELS.SMART, MODELS.FAST] as const;

// ============================================
// SCHEMAS
// ============================================

const architectFindingSchema = z.object({
  category: z.enum([
    "file_length",
    "function_complexity",
    "nesting",
    "duplication",
    "type_safety",
    "barrel_file",
    "test_coverage",
    "naming",
    "architecture",
  ]),
  severity: z.enum(["suggestion", "warning", "violation"]),
  title: z.string(),
  description: z.string(),
  filePath: z.string(),
  recommendation: z.string(),
  autoFixable: z.boolean(),
  estimatedEffort: z.enum(["trivial", "small", "medium", "large"]),
});

const architectReviewSchema = z.object({
  findings: z.array(architectFindingSchema),
  summary: z.string(),
  codeHealthScore: z.number().min(0).max(100),
  agentsMdCompliance: z.number().min(0).max(100),
});

// ============================================
// HELPERS
// ============================================

const buildArchitectContext = (
  repoData: {
    fileStructure?: string;
    codeMetrics?: {
      avgFileSize: number;
      largestFile: { path: string; lines: number };
      avgFunctionLength: number;
      avgNestingDepth: number;
    };
    techStack?: string[];
  },
  agentsMd?: string
): string => {
  const parts: string[] = [];

  if (repoData.codeMetrics) {
    const metrics = repoData.codeMetrics;
    parts.push(
      `Code Metrics:\n- Average file size: ${metrics.avgFileSize} lines\n- Largest file: ${metrics.largestFile.path} (${metrics.largestFile.lines} lines)\n- Average function length: ${metrics.avgFunctionLength} lines\n- Average nesting depth: ${metrics.avgNestingDepth}`
    );
  }

  if (repoData.techStack?.length) {
    parts.push(`Technology Stack: ${repoData.techStack.join(", ")}`);
  }

  if (repoData.fileStructure) {
    parts.push(`File Structure:\n${repoData.fileStructure}`);
  }

  if (agentsMd) {
    parts.push(`AGENTS.md Coding Standards:\n${agentsMd}`);
  }

  return parts.join("\n\n");
};

const mapSeverityToPriority = (
  severity: z.infer<typeof architectFindingSchema>["severity"]
): "high" | "medium" | "low" => {
  const priorityMap = {
    violation: "high" as const,
    warning: "medium" as const,
    suggestion: "low" as const,
  };

  return priorityMap[severity];
};

// ============================================
// MAIN ACTION
// ============================================

export const runArchitectReview = internalAction({
  args: {
    organizationId: v.id("organizations"),
    triggerReason: v.union(
      v.literal("post_merge"),
      v.literal("weekly_scan"),
      v.literal("on_demand")
    ),
    prUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const startTime = Date.now();

    try {
      // Verify organization exists
      const org = await ctx.runQuery(internal.autopilot.tasks.getOrganization, {
        id: args.organizationId,
      });

      if (!org) {
        throw new Error(`Organization not found: ${args.organizationId}`);
      }

      // Log review initiation
      await ctx.runMutation(internal.autopilot.tasks.logActivity, {
        organizationId: args.organizationId,
        agent: "architect",
        level: "info",
        message: `Architect review started (${args.triggerReason}${args.prUrl ? ` - ${args.prUrl}` : ""})`,
      });

      // Load repo analysis for context (fields live on repoAnalysis, not org)
      const repoAnalysis = await ctx.runQuery(
        internal.autopilot.agents.cto.getRepoAnalysisForCto,
        { organizationId: args.organizationId }
      );

      // Build context from repo analysis data
      const context = buildArchitectContext(
        {
          techStack: repoAnalysis?.techStack
            ? [repoAnalysis.techStack]
            : undefined,
          fileStructure: repoAnalysis?.repoStructure ?? undefined,
        },
        undefined
      );

      const userPrompt = `You are a code architect. Analyze the provided repository for code quality and architectural issues.

Focus on:
1. File length violations (> 400 lines)
2. Function cognitive complexity (> 50 lines)
3. Excessive nesting depth (> 3 levels)
4. Code duplication and DRY violations
5. Type safety gaps (use of any, missing types)
6. Barrel files (index files re-exporting everything)
7. Test coverage assessment
8. Naming convention consistency
9. Architecture and design pattern violations
10. AGENTS.md coding standards compliance (if provided)

For each finding, determine:
- Severity: violation (must fix), warning (should fix), suggestion (consider)
- Whether it's auto-fixable (e.g., extract function, remove barrel export)
- Estimated effort to fix: trivial, small, medium, large
- Specific file paths and recommendations

Provide code health score (0-100) and AGENTS.md compliance score.

Review the architecture and code quality of this repository:

${context}

${args.prUrl ? `Focus on changes in this PR: ${args.prUrl}` : ""}

Provide findings in the specified schema. Include compliance scores.`;

      // Call AI with fallback model chain
      const reviewResult = await generateObjectWithFallback({
        models: ARCHITECT_MODELS,
        prompt: userPrompt,
        schema: architectReviewSchema,
        systemPrompt: "",
      });

      // Process findings and create tasks/alerts
      const violationCount = reviewResult.findings.filter(
        (f) => f.severity === "violation"
      ).length;
      const warningCount = reviewResult.findings.filter(
        (f) => f.severity === "warning"
      ).length;
      const autoFixableCount = reviewResult.findings.filter(
        (f) => f.autoFixable
      ).length;

      // Create autopilot tasks for auto-fixable violations
      const taskIds: string[] = [];

      for (const finding of reviewResult.findings) {
        if (finding.autoFixable && finding.severity === "violation") {
          const taskId = await ctx.runMutation(
            internal.autopilot.tasks.createTask,
            {
              organizationId: args.organizationId,
              assignedAgent: "dev",
              title: `Architect: ${finding.title}`,
              description: finding.recommendation,
              origin: "architect_review",
              priority: "high",
              autonomyLevel: "review_required",
              technicalSpec: JSON.stringify({
                architectFinding: finding,
                estimatedEffort: finding.estimatedEffort,
                category: finding.category,
              }),
            }
          );

          taskIds.push(taskId);
        }
      }

      // Create inbox items for significant findings
      for (const finding of reviewResult.findings) {
        if (finding.severity === "violation") {
          await ctx.runMutation(internal.autopilot.inbox.createInboxItem, {
            organizationId: args.organizationId,
            type: "architect_finding",
            title: finding.title,
            summary: finding.description,
            content: `Category: ${finding.category}\nFile: ${finding.filePath}\nRecommendation: ${finding.recommendation}\nEstimated effort: ${finding.estimatedEffort}`,
            sourceAgent: "architect",
            priority: mapSeverityToPriority(finding.severity),
          });
        }
      }

      // Log completion
      await ctx.runMutation(internal.autopilot.tasks.logActivity, {
        organizationId: args.organizationId,
        agent: "architect",
        level: "success",
        message: `Architect review completed: ${reviewResult.findings.length} findings (${violationCount} violations, ${warningCount} warnings), ${autoFixableCount} auto-fixable. Code health: ${reviewResult.codeHealthScore}/100, AGENTS.md compliance: ${reviewResult.agentsMdCompliance}/100`,
      });

      return {
        success: true,
        findingsCount: reviewResult.findings.length,
        violationCount,
        warningCount,
        autoFixableCount,
        codeHealthScore: reviewResult.codeHealthScore,
        agentsMdCompliance: reviewResult.agentsMdCompliance,
        tasksCreated: taskIds.length,
        duration: Date.now() - startTime,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      await ctx.runMutation(internal.autopilot.tasks.logActivity, {
        organizationId: args.organizationId,
        agent: "architect",
        level: "error",
        message: `Architect review failed: ${errorMessage}`,
      });

      throw error;
    }
  },
});
