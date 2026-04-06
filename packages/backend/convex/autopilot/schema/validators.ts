import { v } from "convex/values";

// ============================================
// AUTOPILOT VALIDATORS — V11 Simplified
// ============================================

// Coding adapters
export const codingAdapterType = v.union(
  v.literal("builtin"),
  v.literal("copilot"),
  v.literal("codex"),
  v.literal("claude_code"),
  v.literal("open_swe"),
  v.literal("openclaw")
);

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

// Agents
export const assignedAgent = v.union(
  v.literal("pm"),
  v.literal("cto"),
  v.literal("dev"),
  v.literal("growth"),
  v.literal("orchestrator"),
  v.literal("system"),
  v.literal("support"),
  v.literal("sales")
);

export const agentThreadRole = v.union(v.literal("user"), v.literal("agent"));

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
  v.literal("prospect_brief")
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
// Runs & Activity
// ============================================

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
  v.literal("product_definition"),
  v.literal("roadmap"),
  v.literal("brand_voice"),
  v.literal("team_processes"),
  v.literal("target_audience")
);

export const knowledgeEditedBy = v.union(v.literal("agent"), v.literal("user"));
