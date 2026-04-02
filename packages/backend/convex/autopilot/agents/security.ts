/**
 * Security Agent — Phase 3.4
 *
 * Performs comprehensive security analysis including:
 *   - Dependency vulnerability auditing
 *   - Secret leak detection
 *   - Authentication coverage assessment
 *   - OWASP vulnerability patterns
 *   - Configuration security review
 *
 * Creates autopilot tasks for auto-fixable issues and
 * security alerts in the inbox for significant findings.
 */

import { v } from "convex/values";
import { z } from "zod";
import { internal } from "../../_generated/api";
import { internalAction } from "../../_generated/server";
import { MODELS } from "./models";
import { generateObjectWithFallback } from "./shared";

const SECURITY_MODELS = [MODELS.SMART, MODELS.FAST] as const;

// ============================================
// SCHEMAS
// ============================================

const securityFindingSchema = z.object({
  severity: z.enum(["critical", "high", "medium", "low", "info"]),
  category: z.enum([
    "dependency",
    "secret_leak",
    "auth",
    "injection",
    "xss",
    "config",
    "other",
  ]),
  title: z.string(),
  description: z.string(),
  filePath: z.optional(z.string()),
  recommendation: z.string(),
  autoFixable: z.boolean(),
});

const securityScanSchema = z.object({
  findings: z.array(securityFindingSchema),
  summary: z.string(),
  overallRiskLevel: z.enum(["low", "medium", "high", "critical"]),
  dependencyAudit: z.object({
    outdatedCount: z.number(),
    vulnerableCount: z.number(),
    details: z.array(z.string()),
  }),
});

// ============================================
// HELPERS
// ============================================

const buildSecurityContext = (repoData: {
  fileStructure?: string;
  packageJson?: string;
  dependencies?: string[];
  techStack?: string[];
  lastAnalysis?: {
    timestamp: number;
    fileCount: number;
    totalLines: number;
  };
}): string => {
  const parts: string[] = [];

  if (repoData.techStack?.length) {
    parts.push(`Technology Stack: ${repoData.techStack.join(", ")}`);
  }

  if (repoData.dependencies?.length) {
    parts.push(
      `Dependencies: ${repoData.dependencies.slice(0, 20).join(", ")}`
    );
    if (repoData.dependencies.length > 20) {
      parts.push(`...and ${repoData.dependencies.length - 20} more`);
    }
  }

  if (repoData.packageJson) {
    parts.push(`Package.json:\n${repoData.packageJson}`);
  }

  if (repoData.fileStructure) {
    parts.push(`File Structure:\n${repoData.fileStructure}`);
  }

  return parts.join("\n\n");
};

const mapSeverityToInboxPriority = (
  severity: z.infer<typeof securityFindingSchema>["severity"]
): "critical" | "high" | "medium" | "low" => {
  const priorityMap = {
    critical: "critical" as const,
    high: "high" as const,
    medium: "medium" as const,
    low: "low" as const,
    info: "low" as const,
  };

  return priorityMap[severity];
};

// ============================================
// MAIN ACTION
// ============================================

export const runSecurityScan = internalAction({
  args: {
    organizationId: v.id("organizations"),
    triggerReason: v.union(
      v.literal("post_merge"),
      v.literal("daily_scan"),
      v.literal("on_demand")
    ),
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

      // Log scan initiation
      await ctx.runMutation(internal.autopilot.tasks.logActivity, {
        organizationId: args.organizationId,
        agent: "security",
        level: "info",
        message: `Security scan started (${args.triggerReason})`,
      });

      // Load repo analysis for context (fields live on repoAnalysis, not org)
      const repoAnalysis = await ctx.runQuery(
        internal.autopilot.agents.cto.getRepoAnalysisForCto,
        { organizationId: args.organizationId }
      );

      // Build context from repo analysis data
      const context = buildSecurityContext({
        techStack: repoAnalysis?.techStack
          ? [repoAnalysis.techStack]
          : undefined,
        fileStructure: repoAnalysis?.repoStructure ?? undefined,
      });

      const userPrompt = `You are a security analyst. Analyze the provided repository data for security vulnerabilities, misconfigurations, and best practice violations.

Focus on:
1. OWASP Top 10 patterns (injection, auth flaws, sensitive data exposure, etc.)
2. Dependency vulnerabilities and outdated packages
3. Secret leaks in configuration files
4. Authentication and authorization gaps
5. XSS and CSRF vulnerabilities
6. Insecure cryptography
7. Missing security headers
8. Input validation issues

For each finding, determine:
- Severity: critical (immediate threat), high (significant risk), medium, low, info
- Category: dependency, secret_leak, auth, injection, xss, config, other
- Whether it's auto-fixable (e.g., update dependency, remove hardcoded secrets)
- Specific file paths and recommendations

Provide a summary of the overall security posture and a risk level assessment.

Analyze this repository for security issues:

${context}

Provide findings in the specified schema. Include dependency audit details.`;

      // Call AI with fallback model chain
      const scanResult = await generateObjectWithFallback({
        models: SECURITY_MODELS,
        prompt: userPrompt,
        schema: securityScanSchema,
        systemPrompt: "",
      });

      // Process findings and create tasks/alerts
      const autoFixableCount = scanResult.findings.filter(
        (f) => f.autoFixable
      ).length;
      const criticalCount = scanResult.findings.filter(
        (f) => f.severity === "critical"
      ).length;

      // Create autopilot tasks for auto-fixable issues
      const taskIds: string[] = [];

      for (const finding of scanResult.findings) {
        if (finding.autoFixable) {
          const taskId = await ctx.runMutation(
            internal.autopilot.tasks.createTask,
            {
              organizationId: args.organizationId,
              assignedAgent: "dev",
              title: `Security Fix: ${finding.title}`,
              description: finding.recommendation,
              origin: "security_scan",
              priority: finding.severity === "critical" ? "critical" : "high",
              autonomyLevel: "review_required",
              technicalSpec: JSON.stringify({
                securityFinding: finding,
                category: finding.category,
              }),
            }
          );

          taskIds.push(taskId);
        }
      }

      // Create inbox items for significant findings
      for (const finding of scanResult.findings) {
        if (finding.severity === "critical" || finding.severity === "high") {
          await ctx.runMutation(internal.autopilot.inbox.createInboxItem, {
            organizationId: args.organizationId,
            type: "security_alert",
            title: finding.title,
            summary: finding.description,
            content: `Category: ${finding.category}\nRecommendation: ${finding.recommendation}${finding.filePath ? `\nFile: ${finding.filePath}` : ""}`,
            sourceAgent: "security",
            priority: mapSeverityToInboxPriority(finding.severity),
          });
        }
      }

      // Log completion
      await ctx.runMutation(internal.autopilot.tasks.logActivity, {
        organizationId: args.organizationId,
        agent: "security",
        level: "success",
        message: `Security scan completed: ${scanResult.findings.length} findings (${criticalCount} critical), ${autoFixableCount} auto-fixable issues`,
      });

      return {
        success: true,
        findingsCount: scanResult.findings.length,
        criticalCount,
        autoFixableCount,
        overallRiskLevel: scanResult.overallRiskLevel,
        tasksCreated: taskIds.length,
        duration: Date.now() - startTime,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      await ctx.runMutation(internal.autopilot.tasks.logActivity, {
        organizationId: args.organizationId,
        agent: "security",
        level: "error",
        message: `Security scan failed: ${errorMessage}`,
      });

      throw error;
    }
  },
});
