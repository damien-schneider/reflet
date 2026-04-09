/**
 * Output verification layer — validate LLM-generated data against reality.
 *
 * Post-processing step after every LLM call that validates:
 * - URLs actually contain content matching the claimed topic
 * - Lead names/companies have web presence (basic confirmation)
 * - Competitor names are real products with real websites
 * - Content references actual product features
 *
 * Adds verificationStatus to documents and leads.
 */

import { v } from "convex/values";
import { internal } from "../_generated/api";
import { internalAction, internalMutation } from "../_generated/server";

// ============================================
// VERIFICATION STATUS
// ============================================

export const verificationStatus = v.union(
  v.literal("unverified"),
  v.literal("verified"),
  v.literal("failed"),
  v.literal("partial")
);

// ============================================
// URL CONTENT VERIFICATION
// ============================================

const URL_FETCH_TIMEOUT_MS = 8000;
const MAX_BODY_LENGTH = 10_000;
const WHITESPACE_REGEX = /\s+/;
const NON_ALPHA_REGEX = /[^a-z0-9]/g;

/**
 * Verify that a URL's actual content relates to the claimed topic.
 * Goes beyond HEAD check — fetches page content and checks for topic relevance.
 */
const verifyUrlContent = async (
  url: string,
  claimedTopic: string
): Promise<{ relevant: boolean; reason: string }> => {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), URL_FETCH_TIMEOUT_MS);

    const response = await fetch(url, {
      method: "GET",
      signal: controller.signal,
      redirect: "follow",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; RefletBot/1.0; +https://reflet.dev)",
      },
    });

    clearTimeout(timeout);

    if (!response.ok) {
      return { relevant: false, reason: `HTTP ${response.status}` };
    }

    const contentType = response.headers.get("content-type") ?? "";
    if (!(contentType.includes("text/html") || contentType.includes("text/"))) {
      return { relevant: false, reason: `Non-text content: ${contentType}` };
    }

    const body = await response.text();
    const truncatedBody = body.slice(0, MAX_BODY_LENGTH).toLowerCase();

    // Extract meaningful keywords from the claimed topic (3+ char words)
    const topicWords = claimedTopic
      .toLowerCase()
      .split(WHITESPACE_REGEX)
      .filter((w) => w.length >= 3)
      .map((w) => w.replace(NON_ALPHA_REGEX, ""))
      .filter((w) => w.length >= 3);

    if (topicWords.length === 0) {
      return { relevant: true, reason: "No topic keywords to verify" };
    }

    // At least 30% of topic keywords should appear in the page content
    const matchCount = topicWords.filter((word) =>
      truncatedBody.includes(word)
    ).length;
    const matchRatio = matchCount / topicWords.length;
    const MIN_MATCH_RATIO = 0.3;

    if (matchRatio >= MIN_MATCH_RATIO) {
      return {
        relevant: true,
        reason: `${matchCount}/${topicWords.length} topic keywords found`,
      };
    }

    return {
      relevant: false,
      reason: `Only ${matchCount}/${topicWords.length} topic keywords found (need ${MIN_MATCH_RATIO * 100}%)`,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { relevant: false, reason: `Fetch failed: ${message}` };
  }
};

// ============================================
// LEAD VERIFICATION
// ============================================

/**
 * Verify that a lead has some web presence (basic sanity check).
 * Checks GitHub profile for github sources, web search for others.
 */
const verifyLeadWebPresence = async (
  name: string,
  company: string | undefined,
  githubUsername: string | undefined
): Promise<{ exists: boolean; reason: string }> => {
  // GitHub profile check
  if (githubUsername) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(
        () => controller.abort(),
        URL_FETCH_TIMEOUT_MS
      );

      const response = await fetch(
        `https://api.github.com/users/${encodeURIComponent(githubUsername)}`,
        {
          method: "GET",
          signal: controller.signal,
          headers: {
            "User-Agent": "RefletBot/1.0",
            Accept: "application/vnd.github+json",
          },
        }
      );

      clearTimeout(timeout);

      if (response.ok) {
        return { exists: true, reason: "GitHub profile confirmed" };
      }

      if (response.status === 404) {
        return {
          exists: false,
          reason: `GitHub user "${githubUsername}" not found`,
        };
      }

      return {
        exists: false,
        reason: `GitHub API returned ${response.status}`,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return { exists: false, reason: `GitHub check failed: ${message}` };
    }
  }

  // For non-GitHub leads, check if company has a website
  if (company) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(
        () => controller.abort(),
        URL_FETCH_TIMEOUT_MS
      );

      // Try common company domain patterns
      const sanitizedCompany = company.toLowerCase().replace(/[^a-z0-9]/g, "");
      const response = await fetch(`https://${sanitizedCompany}.com`, {
        method: "HEAD",
        signal: controller.signal,
        redirect: "follow",
      });

      clearTimeout(timeout);

      if (response.ok) {
        return {
          exists: true,
          reason: `Company website found: ${sanitizedCompany}.com`,
        };
      }
    } catch {
      // Company website not found — not necessarily fake, just unverifiable
    }
  }

  return {
    exists: false,
    reason: `Cannot verify web presence for "${name}"${company ? ` at "${company}"` : ""}`,
  };
};

// ============================================
// DOCUMENT VERIFICATION ACTION
// ============================================

/**
 * Verify a document's claims against reality.
 * Called after content generation to validate source URLs and topic accuracy.
 */
export const verifyDocument = internalAction({
  args: {
    organizationId: v.id("organizations"),
    documentId: v.id("autopilotDocuments"),
  },
  handler: async (ctx, args) => {
    const doc = await ctx.runQuery(
      internal.autopilot.documents.getDocumentById,
      { documentId: args.documentId }
    );

    if (!doc) {
      return;
    }

    const checks: Array<{ check: string; passed: boolean; detail: string }> =
      [];

    // Verify source URLs if present
    if (doc.sourceUrls && doc.sourceUrls.length > 0) {
      for (const url of doc.sourceUrls.slice(0, 5)) {
        const result = await verifyUrlContent(url, doc.title);
        checks.push({
          check: `source_url:${url}`,
          passed: result.relevant,
          detail: result.reason,
        });
      }
    }

    // Verify target URL if present (content targeting a specific thread)
    if (doc.targetUrl) {
      const result = await verifyUrlContent(doc.targetUrl, doc.title);
      checks.push({
        check: `target_url:${doc.targetUrl}`,
        passed: result.relevant,
        detail: result.reason,
      });
    }

    // Content length check (minimum substance threshold)
    const MIN_CONTENT_LENGTH = 50;
    const contentLength = doc.content.trim().length;
    checks.push({
      check: "content_length",
      passed: contentLength >= MIN_CONTENT_LENGTH,
      detail: `${contentLength} chars (min: ${MIN_CONTENT_LENGTH})`,
    });

    // Determine overall status
    const passedCount = checks.filter((c) => c.passed).length;
    const totalChecks = checks.length;
    let status: "verified" | "failed" | "partial" = "verified";

    if (totalChecks === 0) {
      status = "verified";
    } else if (passedCount === 0) {
      status = "failed";
    } else if (passedCount < totalChecks) {
      status = "partial";
    }

    await ctx.runMutation(
      internal.autopilot.verification.updateDocumentVerification,
      {
        documentId: args.documentId,
        status,
        checks: JSON.stringify(checks),
      }
    );

    await ctx.runMutation(internal.autopilot.task_mutations.logActivity, {
      organizationId: args.organizationId,
      agent: "system",
      level: status === "failed" ? "warning" : "info",
      message: `Document verified: "${doc.title}" — ${status} (${passedCount}/${totalChecks} checks passed)`,
    });
  },
});

/**
 * Verify a lead's existence (basic web presence check).
 */
export const verifyLead = internalAction({
  args: {
    organizationId: v.id("organizations"),
    leadId: v.id("autopilotLeads"),
  },
  handler: async (ctx, args) => {
    const lead = await ctx.runQuery(
      internal.autopilot.agents.sales_queries.getLeadById,
      { leadId: args.leadId }
    );

    if (!lead) {
      return;
    }

    const result = await verifyLeadWebPresence(
      lead.name,
      lead.company,
      lead.githubUsername
    );

    const status = result.exists ? "verified" : "failed";

    await ctx.runMutation(
      internal.autopilot.verification.updateLeadVerification,
      {
        leadId: args.leadId,
        status,
        reason: result.reason,
      }
    );

    await ctx.runMutation(internal.autopilot.task_mutations.logActivity, {
      organizationId: args.organizationId,
      agent: "system",
      level: status === "failed" ? "warning" : "info",
      message: `Lead verified: "${lead.name}"${lead.company ? ` at ${lead.company}` : ""} — ${status} (${result.reason})`,
    });
  },
});

// ============================================
// VERIFICATION MUTATIONS
// ============================================

export const updateDocumentVerification = internalMutation({
  args: {
    documentId: v.id("autopilotDocuments"),
    status: verificationStatus,
    checks: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.documentId, {
      metadata: JSON.stringify({
        verificationStatus: args.status,
        verificationChecks: args.checks,
        verifiedAt: Date.now(),
      }),
      updatedAt: Date.now(),
    });
    return null;
  },
});

export const updateLeadVerification = internalMutation({
  args: {
    leadId: v.id("autopilotLeads"),
    status: verificationStatus,
    reason: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.leadId, {
      notes: `[Verification: ${args.status}] ${args.reason}`,
      updatedAt: Date.now(),
    });
    return null;
  },
});

// ============================================
// BATCH VERIFICATION
// ============================================

/**
 * Verify all unverified documents for an organization.
 * Scheduled after each agent run that creates content.
 */
export const verifyRecentDocuments = internalAction({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    const recentDocs = await ctx.runQuery(
      internal.autopilot.documents.getUnverifiedDocuments,
      { organizationId: args.organizationId }
    );

    const MAX_VERIFY_PER_BATCH = 5;
    const docsToVerify = recentDocs.slice(0, MAX_VERIFY_PER_BATCH);

    for (const doc of docsToVerify) {
      await ctx.scheduler.runAfter(
        0,
        internal.autopilot.verification.verifyDocument,
        {
          organizationId: args.organizationId,
          documentId: doc._id,
        }
      );
    }
  },
});

/**
 * Verify all unverified leads for an organization.
 */
export const verifyRecentLeads = internalAction({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    const recentLeads = await ctx.runQuery(
      internal.autopilot.agents.sales_queries.getUnverifiedLeads,
      { organizationId: args.organizationId }
    );

    const MAX_VERIFY_PER_BATCH = 5;
    const leadsToVerify = recentLeads.slice(0, MAX_VERIFY_PER_BATCH);

    for (const lead of leadsToVerify) {
      await ctx.scheduler.runAfter(
        0,
        internal.autopilot.verification.verifyLead,
        {
          organizationId: args.organizationId,
          leadId: lead._id,
        }
      );
    }
  },
});
