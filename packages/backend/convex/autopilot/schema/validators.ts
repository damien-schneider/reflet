import { v } from "convex/values";

// ============================================
// AUTOPILOT VALIDATORS — V11 Simplified
// ============================================

// Autonomy
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

// Role skills are visible runtime capabilities in one chain.
export const assignedRole = v.union(
  v.literal("pm"),
  v.literal("cto"),
  v.literal("growth"),
  v.literal("system"),
  v.literal("support"),
  v.literal("sales"),
  v.literal("ceo"),
  v.literal("validator")
);

export const roleSkill = v.union(
  v.literal("cto"),
  v.literal("pm"),
  v.literal("growth"),
  v.literal("sales"),
  v.literal("support"),
  v.literal("validator"),
  v.literal("ceo")
);

export const autopilotExecutionStatus = v.union(
  v.literal("queued"),
  v.literal("running"),
  v.literal("succeeded"),
  v.literal("failed"),
  v.literal("blocked")
);

export const autopilotExecutionTriggerReason = v.union(
  v.literal("dependency_ready"),
  v.literal("review_gate_clear"),
  v.literal("stale_artifact"),
  v.literal("support_conversation"),
  v.literal("approved_delivery"),
  v.literal("failed_execution_retry"),
  v.literal("manual_refresh"),
  v.literal("task_ready"),
  v.literal("validation_required"),
  v.literal("coordination_required")
);

export const autopilotExecutionActionKind = v.union(
  v.literal("chain_producer"),
  v.literal("task_dispatch"),
  v.literal("validation_pass"),
  v.literal("support_triage"),
  v.literal("ceo_coordination"),
  v.literal("growth_content"),
  v.literal("refresh_deliverable")
);

export const communityPlatform = v.union(
  v.literal("reddit"),
  v.literal("hackernews"),
  v.literal("twitter"),
  v.literal("linkedin"),
  v.literal("indiehackers"),
  v.literal("devto"),
  v.literal("other")
);

// ============================================
// Role-skill memory categories
// ============================================

export const memoryCategory = v.union(
  v.literal("topic_researched"),
  v.literal("channel_tried"),
  v.literal("strategy_outcome"),
  v.literal("lead_contacted"),
  v.literal("content_published"),
  v.literal("decision_made"),
  v.literal("lesson_learned")
);

// ============================================
// Work Items (replaces tasks, initiatives, stories, specs)
// ============================================

export const workItemType = v.union(
  v.literal("initiative"),
  v.literal("story"),
  v.literal("task"),
  v.literal("spec"),
  v.literal("bug")
);

export const workItemStatus = v.union(
  v.literal("triage"),
  v.literal("backlog"),
  v.literal("todo"),
  v.literal("in_progress"),
  v.literal("in_review"),
  v.literal("done"),
  v.literal("cancelled")
);

export const priority = v.union(
  v.literal("critical"),
  v.literal("high"),
  v.literal("medium"),
  v.literal("low")
);

// ============================================
// Documents (unified content)
// ============================================

export const documentType = v.union(
  v.literal("blog_post"),
  v.literal("market_research"),
  v.literal("note"),
  v.literal("email"),
  v.literal("support_thread"),
  v.literal("battlecard"),
  v.literal("changelog"),
  v.literal("reddit_reply"),
  v.literal("linkedin_post"),
  v.literal("twitter_post"),
  v.literal("hn_comment"),
  v.literal("adr"),
  v.literal("prospect_brief"),
  // Chain canonical artifacts
  v.literal("codebase_understanding"),
  v.literal("app_description"),
  v.literal("target_definition"),
  v.literal("persona_brief")
);

// ============================================
// Chain — DAG of canonical artifacts
// ============================================

export const chainNodeKind = v.union(
  v.literal("codebase_understanding"),
  v.literal("product_profile"),
  v.literal("brand_voice"),
  v.literal("feature_catalog"),
  v.literal("scope"),
  v.literal("market_analysis"),
  v.literal("target_definition"),
  v.literal("personas"),
  v.literal("use_cases"),
  v.literal("lead_targets"),
  v.literal("community_posts"),
  v.literal("drafts")
);

export const chainNodeStatus = v.union(
  v.literal("missing"),
  v.literal("draft"),
  v.literal("pending_review"),
  v.literal("published")
);

export const bridgeInstallationStatus = v.union(
  v.literal("online"),
  v.literal("offline"),
  v.literal("blocked")
);

export const bridgeJobStatus = v.union(
  v.literal("queued"),
  v.literal("running"),
  v.literal("succeeded"),
  v.literal("failed"),
  v.literal("blocked")
);

export const bridgeDoctorCheck = v.object({
  label: v.string(),
  message: v.optional(v.string()),
  passed: v.boolean(),
});

export const harnessArtifactKind = v.union(
  v.literal("product_brain"),
  v.literal("codebase_map"),
  v.literal("market_map"),
  v.literal("audience_research"),
  v.literal("use_case_map"),
  v.literal("product_gap_analysis"),
  v.literal("posthog_audit"),
  v.literal("bug_report"),
  v.literal("task_plan"),
  v.literal("pull_request_draft"),
  v.literal("pull_request_review"),
  v.literal("changelog"),
  v.literal("growth_draft"),
  v.literal("community_drafts")
);

export const harnessValidationStatus = v.union(
  v.literal("passed"),
  v.literal("warning"),
  v.literal("failed")
);

export const documentStatus = v.union(
  v.literal("draft"),
  v.literal("pending_review"),
  v.literal("published"),
  v.literal("archived")
);

export const impactLevel = v.union(
  v.literal("high"),
  v.literal("medium"),
  v.literal("low")
);

// ============================================
// Activity
// ============================================

export const activityLogLevel = v.union(
  v.literal("info"),
  v.literal("action"),
  v.literal("success"),
  v.literal("warning"),
  v.literal("error")
);

export const activityEntityType = v.union(
  v.literal("work_item"),
  v.literal("document"),
  v.literal("knowledge_doc"),
  v.literal("lead"),
  v.literal("competitor")
);

// ============================================
// Leads
// ============================================

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

// ============================================
// Knowledge
// ============================================

export const knowledgeDocType = v.union(
  v.literal("roadmap"),
  v.literal("brand_voice"),
  v.literal("team_processes"),
  v.literal("target_audience"),
  v.literal("feature_catalog"),
  v.literal("scope")
);

export const knowledgeEditedBy = v.union(
  v.literal("role_skill"),
  v.literal("user")
);
