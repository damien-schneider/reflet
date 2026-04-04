import { v } from "convex/values";

// ============================================
// AUTOPILOT VALIDATORS
// ============================================

export const codingAdapterType = v.union(
  v.literal("builtin"),
  v.literal("copilot"),
  v.literal("codex"),
  v.literal("claude_code"),
  v.literal("open_swe"),
  v.literal("openclaw")
);

export const autonomyLevel = v.union(
  v.literal("full_auto"),
  v.literal("review_required"),
  v.literal("manual")
);

export const autonomyMode = v.union(
  v.literal("supervised"),
  v.literal("full_auto"),
  v.literal("stopped")
);

export const autopilotTaskStatus = v.union(
  v.literal("pending"),
  v.literal("in_progress"),
  v.literal("blocked"),
  v.literal("waiting_review"),
  v.literal("paused"),
  v.literal("completed"),
  v.literal("failed"),
  v.literal("cancelled")
);

export const autopilotTaskPriority = v.union(
  v.literal("critical"),
  v.literal("high"),
  v.literal("medium"),
  v.literal("low")
);

export const assignedAgent = v.union(
  v.literal("pm"),
  v.literal("cto"),
  v.literal("dev"),
  v.literal("security"),
  v.literal("architect"),
  v.literal("growth"),
  v.literal("orchestrator"),
  v.literal("system"),
  v.literal("support"),
  v.literal("docs"),
  v.literal("sales")
);

export const taskOrigin = v.union(
  v.literal("pm_analysis"),
  v.literal("security_scan"),
  v.literal("architect_review"),
  v.literal("growth_suggestion"),
  v.literal("user_created"),
  v.literal("cto_breakdown"),
  v.literal("support_escalation"),
  v.literal("docs_update"),
  v.literal("sales_outreach"),
  v.literal("onboarding")
);

export const runStatus = v.union(
  v.literal("queued"),
  v.literal("sandbox_starting"),
  v.literal("cloning"),
  v.literal("exploring"),
  v.literal("coding"),
  v.literal("testing"),
  v.literal("creating_pr"),
  v.literal("waiting_ci"),
  v.literal("ci_fixing"),
  v.literal("completed"),
  v.literal("failed"),
  v.literal("cancelled")
);

export const activityLogLevel = v.union(
  v.literal("info"),
  v.literal("action"),
  v.literal("success"),
  v.literal("warning"),
  v.literal("error")
);

export const activityLogAgent = v.union(
  v.literal("pm"),
  v.literal("cto"),
  v.literal("dev"),
  v.literal("security"),
  v.literal("architect"),
  v.literal("growth"),
  v.literal("orchestrator"),
  v.literal("system"),
  v.literal("support"),
  v.literal("docs"),
  v.literal("sales")
);

export const emailDirection = v.union(
  v.literal("inbound"),
  v.literal("outbound")
);

export const emailStatus = v.union(
  v.literal("approved"),
  v.literal("draft"),
  v.literal("pending_review"),
  v.literal("received"),
  v.literal("rejected"),
  v.literal("sent")
);

export const growthItemStatus = v.union(
  v.literal("approved"),
  v.literal("draft"),
  v.literal("pending_review"),
  v.literal("published"),
  v.literal("rejected")
);

export const growthItemType = v.union(
  v.literal("blog_post"),
  v.literal("changelog_announce"),
  v.literal("email_campaign"),
  v.literal("hn_comment"),
  v.literal("linkedin_post"),
  v.literal("reddit_reply"),
  v.literal("twitter_post")
);

export const inboxItemStatus = v.union(
  v.literal("approved"),
  v.literal("auto_approved"),
  v.literal("expired"),
  v.literal("pending"),
  v.literal("rejected"),
  v.literal("snoozed")
);

export const inboxItemType = v.union(
  v.literal("architect_finding"),
  v.literal("ceo_report"),
  v.literal("email_draft"),
  v.literal("email_received"),
  v.literal("growth_post"),
  v.literal("pr_review"),
  v.literal("revenue_alert"),
  v.literal("security_alert"),
  v.literal("task_approval"),
  v.literal("support_reply"),
  v.literal("support_escalation"),
  v.literal("shipped_notification"),
  v.literal("docs_update"),
  v.literal("docs_stale"),
  v.literal("sales_lead"),
  v.literal("sales_outreach_draft"),
  v.literal("sales_pipeline_update"),
  v.literal("note_triage"),
  v.literal("initiative_proposal"),
  v.literal("knowledge_update"),
  v.literal("company_brief_review")
);

export const leadStatus = v.union(
  v.literal("discovered"),
  v.literal("contacted"),
  v.literal("replied"),
  v.literal("demo"),
  v.literal("converted"),
  v.literal("churned"),
  v.literal("disqualified")
);

export const leadSource = v.union(
  v.literal("github_star"),
  v.literal("github_fork"),
  v.literal("product_hunt"),
  v.literal("hackernews"),
  v.literal("reddit"),
  v.literal("web_search"),
  v.literal("referral"),
  v.literal("manual")
);

export const agentThreadRole = v.union(v.literal("user"), v.literal("agent"));

// ============================================
// NEW VALIDATORS (Knowledge / Signals / Initiatives)
// ============================================

export const knowledgeDocType = v.union(
  v.literal("product_definition"),
  v.literal("user_personas_icp"),
  v.literal("competitive_landscape"),
  v.literal("brand_voice"),
  v.literal("technical_architecture"),
  v.literal("goals_okrs"),
  v.literal("product_roadmap")
);

export const knowledgeEditedBy = v.union(v.literal("agent"), v.literal("user"));

export const initiativeStatus = v.union(
  v.literal("discovery"),
  v.literal("definition"),
  v.literal("active"),
  v.literal("completed"),
  v.literal("paused"),
  v.literal("cancelled")
);

export const userStoryStatus = v.union(
  v.literal("draft"),
  v.literal("ready"),
  v.literal("in_spec"),
  v.literal("in_dev"),
  v.literal("in_review"),
  v.literal("shipped"),
  v.literal("cancelled")
);

export const technicalSpecComplexity = v.union(
  v.literal("small"),
  v.literal("medium"),
  v.literal("large")
);

export const technicalSpecStatus = v.union(
  v.literal("draft"),
  v.literal("approved"),
  v.literal("in_dev"),
  v.literal("completed")
);

export const architectureDecisionStatus = v.union(
  v.literal("proposed"),
  v.literal("accepted"),
  v.literal("deprecated"),
  v.literal("superseded")
);

export const noteType = v.union(
  v.literal("observation"),
  v.literal("recommendation"),
  v.literal("alert"),
  v.literal("research"),
  v.literal("status_update")
);

export const noteStatus = v.union(
  v.literal("new"),
  v.literal("triaged"),
  v.literal("acted_on"),
  v.literal("dismissed")
);

export const noteCategory = v.union(
  v.literal("product"),
  v.literal("engineering"),
  v.literal("market"),
  v.literal("prospect"),
  v.literal("security"),
  v.literal("architecture"),
  v.literal("support"),
  v.literal("documentation"),
  v.literal("coordination")
);

export const initiativeCreatedBy = v.union(
  v.literal("pm"),
  v.literal("ceo"),
  v.literal("user")
);
