/**
 * Heartbeat wake conditions — pure functions + data query.
 *
 * Pure functions exported for testability.
 *
 * WORK-DRIVEN ARCHITECTURE: Agents wake ONLY when there's actual work
 * on the shared board. No time-based fallbacks. The pipeline is self-sustaining:
 *   Growth → documents → PM → stories → CTO → specs → Dev → ships → Growth
 *
 * The only reasons the company stops:
 *   1. Waiting for President approval (items in needsReview)
 *   2. Plan limits / credits exhausted (guards block execution)
 *   3. Pipeline is full (cap reached, waiting for work to complete)
 */

import { v } from "convex/values";
import { internalQuery } from "../_generated/server";

const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const THREE_STORY_THRESHOLD = 3;
const QUERY_LIMIT = 200;
const GROWTH_FOLLOWUP_DAMPENING_MS = 30 * 60 * 1000; // 30 minutes
const MAX_PENDING_GROWTH_CONTENT = 10;

// ============================================
// PURE WAKE CONDITION FUNCTIONS (for testing)
// ============================================

interface ActivitySummary {
  approvedSpecCount: number;
  discoveredLeadCount: number;
  failedRunCount: number;
  growthFollowUpNoteCount: number;
  hasInitiatives: boolean;
  hasLeads: boolean;
  hasResearchDocs: boolean;
  leadsNeedingFollowUp: number;
  newNoteCount: number;
  newSupportConversationCount: number;
  now: number;
  pendingGrowthContentCount: number;
  readyStoryCount: number;
  recentErrorCount: number;
  recentGrowthSuccessAt: number | null;
  shippedFeaturesWithoutContent: number;
  stuckReviewCount: number;
}

/**
 * PM wakes when there's planning work to do:
 * - No initiatives exist (bootstrap the roadmap)
 * - New notes from other agents need processing
 * - Story pipeline is running low (agents need more work)
 */
export const shouldWakePM = (summary: ActivitySummary): boolean => {
  if (!summary.hasInitiatives) {
    return true;
  }
  if (summary.newNoteCount > 0) {
    return true;
  }
  if (summary.readyStoryCount < THREE_STORY_THRESHOLD) {
    return true;
  }
  return false;
};

/**
 * CTO wakes when stories need technical specs.
 * Purely work-driven — only when stories are ready.
 */
export const shouldWakeCTO = (summary: ActivitySummary): boolean => {
  return summary.readyStoryCount > 0;
};

/**
 * Dev wakes when specs are approved or runs need retrying.
 * Purely work-driven — only when code work exists.
 */
export const shouldWakeDev = (summary: ActivitySummary): boolean => {
  return summary.approvedSpecCount > 0 || summary.failedRunCount > 0;
};

/**
 * Growth wakes when there's content or research work:
 * - No research docs exist (bootstrap — prime the pipeline)
 * - Shipped features need content/announcements
 * - Growth has unprocessed follow-up notes (self-driven curiosity),
 *   BUT only if Growth hasn't had a successful run in the last 30 minutes
 *   (prevents no-op spam when guards block execution)
 */
export const shouldWakeGrowth = (summary: ActivitySummary): boolean => {
  // Bootstrap always runs — we need initial research regardless of backlog
  if (!summary.hasResearchDocs) {
    return true;
  }

  // Content backlog full — don't wake for content-producing reasons
  const contentBacklogFull =
    summary.pendingGrowthContentCount >= MAX_PENDING_GROWTH_CONTENT;

  if (summary.shippedFeaturesWithoutContent > 0) {
    return !contentBacklogFull;
  }
  if (summary.growthFollowUpNoteCount > 0) {
    if (contentBacklogFull) {
      return false;
    }
    // Dampen follow-up wakes: only trigger if Growth hasn't run recently
    const recentlyRan =
      summary.recentGrowthSuccessAt !== null &&
      summary.now - summary.recentGrowthSuccessAt <
        GROWTH_FOLLOWUP_DAMPENING_MS;
    return !recentlyRan;
  }
  return false;
};

/**
 * Sales wakes when there's pipeline work:
 * - No leads exist yet (bootstrap — prime the pipeline with prospecting)
 * - Discovered leads need initial outreach
 * - Leads have overdue follow-ups
 */
export const shouldWakeSales = (summary: ActivitySummary): boolean => {
  if (!summary.hasLeads && summary.hasResearchDocs) {
    return true;
  }
  if (summary.discoveredLeadCount > 0) {
    return true;
  }
  if (summary.leadsNeedingFollowUp > 0) {
    return true;
  }
  return false;
};

/**
 * CEO wakes when coordination is needed:
 * - Items stuck in review (bottleneck)
 * - Recent errors need attention (agent issues)
 */
export const shouldWakeCEO = (summary: ActivitySummary): boolean => {
  if (summary.stuckReviewCount > 0) {
    return true;
  }
  if (summary.recentErrorCount > 0) {
    return true;
  }
  return false;
};

/**
 * Support wakes when new conversations arrive.
 * Purely work-driven — only when support threads exist.
 */
export const shouldWakeSupport = (summary: ActivitySummary): boolean => {
  return summary.newSupportConversationCount > 0;
};

// ============================================
// QUERY — collect wake conditions
// ============================================

export const checkWakeConditions = internalQuery({
  args: { organizationId: v.id("organizations") },
  returns: v.object({
    shouldWake: v.object({
      pm: v.boolean(),
      cto: v.boolean(),
      dev: v.boolean(),
      growth: v.boolean(),
      sales: v.boolean(),
      ceo: v.boolean(),
      support: v.boolean(),
    }),
    signals: v.object({
      shippedFeaturesWithoutContent: v.boolean(),
    }),
  }),
  handler: async (ctx, args) => {
    const now = Date.now();

    // ---- Work items by type/status ----

    const readyStories = await ctx.db
      .query("autopilotWorkItems")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", args.organizationId).eq("type", "story")
      )
      .take(QUERY_LIMIT);
    const readyStoryCount = readyStories.filter(
      (s) => s.status === "todo"
    ).length;

    const specItems = await ctx.db
      .query("autopilotWorkItems")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", args.organizationId).eq("type", "spec")
      )
      .take(QUERY_LIMIT);
    const approvedSpecCount = specItems.filter(
      (s) => s.status === "in_review" || s.status === "done"
    ).length;

    // Bootstrap: check if initiatives exist
    const initiatives = await ctx.db
      .query("autopilotWorkItems")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", args.organizationId).eq("type", "initiative")
      )
      .take(1);
    const hasInitiatives = initiatives.length > 0;

    // ---- Failed runs (last 24h) ----

    const failedRuns = await ctx.db
      .query("autopilotRuns")
      .withIndex("by_org_status", (q) =>
        q.eq("organizationId", args.organizationId).eq("status", "failed")
      )
      .take(QUERY_LIMIT);
    const recentFailedRuns = failedRuns.filter(
      (r) => now - r.startedAt < ONE_DAY_MS
    );

    // ---- Documents (notes, support, research) ----

    const draftDocs = await ctx.db
      .query("autopilotDocuments")
      .withIndex("by_org_status", (q) =>
        q.eq("organizationId", args.organizationId).eq("status", "draft")
      )
      .take(QUERY_LIMIT);
    const newNoteCount = draftDocs.filter(
      (d) =>
        d.type === "note" &&
        !d.tags.includes("coordination") &&
        !d.tags.includes("growth-followup")
    ).length;
    const newSupportConversationCount = draftDocs.filter(
      (d) => d.type === "support_thread"
    ).length;

    // Bootstrap: check if any research docs exist
    const researchDocs = await ctx.db
      .query("autopilotDocuments")
      .withIndex("by_org_type", (q) =>
        q
          .eq("organizationId", args.organizationId)
          .eq("type", "market_research")
      )
      .take(1);
    const hasResearchDocs = researchDocs.length > 0;

    // Growth self-driven curiosity: check for unprocessed follow-up notes
    const growthFollowUpNotes = draftDocs.filter(
      (d) =>
        d.type === "note" &&
        d.sourceAgent === "growth" &&
        d.tags.includes("growth-followup")
    );
    const growthFollowUpNoteCount = growthFollowUpNotes.length;

    // Growth content backlog: count pending_review docs from growth agent
    const pendingGrowthContent = await ctx.db
      .query("autopilotDocuments")
      .withIndex("by_org_status", (q) =>
        q
          .eq("organizationId", args.organizationId)
          .eq("status", "pending_review")
      )
      .take(QUERY_LIMIT);
    const pendingGrowthContentCount = pendingGrowthContent.filter(
      (d) => d.sourceAgent === "growth"
    ).length;

    // ---- Shipped features without content (Growth signal) ----

    const doneItems = await ctx.db
      .query("autopilotWorkItems")
      .withIndex("by_org_status", (q) =>
        q.eq("organizationId", args.organizationId).eq("status", "done")
      )
      .take(QUERY_LIMIT);
    const recentDoneItems = doneItems.filter(
      (t) => now - t.updatedAt < ONE_WEEK_MS
    );

    // Check which done items have linked content documents
    let shippedWithoutContent = 0;
    for (const item of recentDoneItems.slice(0, 20)) {
      const linkedDocs = await ctx.db
        .query("autopilotDocuments")
        .withIndex("by_linked_work", (q) => q.eq("linkedWorkItemId", item._id))
        .take(1);
      if (linkedDocs.length === 0) {
        shippedWithoutContent++;
      }
    }

    // ---- Sales signals ----

    const leads = await ctx.db
      .query("autopilotLeads")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .take(QUERY_LIMIT);
    const hasLeads = leads.length > 0;
    const discoveredLeadCount = leads.filter(
      (l) => l.status === "discovered"
    ).length;
    const leadsNeedingFollowUp = leads.filter(
      (l) =>
        l.nextFollowUpAt !== undefined &&
        l.nextFollowUpAt <= now &&
        l.status !== "converted" &&
        l.status !== "churned" &&
        l.status !== "disqualified"
    ).length;

    // ---- CEO coordination signals ----

    const reviewItems = await ctx.db
      .query("autopilotWorkItems")
      .withIndex("by_org_review", (q) =>
        q.eq("organizationId", args.organizationId).eq("needsReview", true)
      )
      .take(QUERY_LIMIT);
    const stuckReviewCount = reviewItems.filter(
      (item) => now - item.updatedAt > ONE_DAY_MS
    ).length;

    const recentActivity = await ctx.db
      .query("autopilotActivityLog")
      .withIndex("by_org_created", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .order("desc")
      .take(100);
    const recentErrorCount = recentActivity.filter(
      (a) => a.level === "error" && now - a.createdAt < ONE_DAY_MS
    ).length;

    // ---- Growth dampening: find last successful growth execution ----

    const lastGrowthSuccess = recentActivity.find(
      (a) => a.agent === "growth" && a.level === "success"
    );
    const recentGrowthSuccessAt = lastGrowthSuccess?.createdAt ?? null;

    // ---- Build summary ----

    const summary: ActivitySummary = {
      readyStoryCount,
      approvedSpecCount,
      failedRunCount: recentFailedRuns.length,
      growthFollowUpNoteCount,
      newNoteCount,
      newSupportConversationCount,
      shippedFeaturesWithoutContent: shippedWithoutContent,
      hasInitiatives,
      hasLeads,
      hasResearchDocs,
      discoveredLeadCount,
      leadsNeedingFollowUp,
      pendingGrowthContentCount,
      stuckReviewCount,
      recentErrorCount,
      recentGrowthSuccessAt,
      now,
    };

    return {
      shouldWake: {
        pm: shouldWakePM(summary),
        cto: shouldWakeCTO(summary),
        dev: shouldWakeDev(summary),
        growth: shouldWakeGrowth(summary),
        sales: shouldWakeSales(summary),
        ceo: shouldWakeCEO(summary),
        support: shouldWakeSupport(summary),
      },
      signals: {
        shippedFeaturesWithoutContent: shippedWithoutContent > 0,
      },
    };
  },
});
