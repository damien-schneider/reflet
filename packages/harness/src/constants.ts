export const PRODUCTMAP_TOPICS = [
  "product_strategy",
  "product_generation",
  "product_analysis",
  "product_delivery",
  "people_process",
] as const;

export const PRODUCTMAP_LIFECYCLES = [
  "strategy",
  "generation",
  "analysis",
  "delivery",
  "people_process",
] as const;

export const HARNESS_SUBAGENTS = [
  "codebase-mapper",
  "product-strategist",
  "market-researcher",
  "competitor-scout",
  "audience-researcher",
  "use-case-designer",
  "bug-finder",
  "task-planner",
  "implementation-agent",
  "pr-reviewer",
  "posthog-analyst",
  "growth-writer",
  "critic-validator",
] as const;

export const HARNESS_ARTIFACT_KINDS = [
  "product_brain",
  "codebase_map",
  "market_map",
  "audience_research",
  "use_case_map",
  "product_gap_analysis",
  "posthog_audit",
  "bug_report",
  "task_plan",
  "pull_request_draft",
  "pull_request_review",
  "changelog",
  "growth_draft",
  "community_drafts",
] as const;

export const HARNESS_VALIDATIONS = [
  "evidence_required",
  "productmap_topic_aligned",
  "repo_paths_valid",
  "no_private_user_data",
  "action_requires_approval",
  "output_hash_changed",
  "reviewer_passed",
] as const;

export const REFLET_KNOWLEDGE_PATHS = [
  ".reflet/manifest.json",
  ".reflet/harness",
  ".reflet/harness/recipes",
  ".reflet/harness/prompts",
  ".reflet/harness/validators",
  ".reflet/harness/subagents",
  ".reflet/harness/rubrics",
  ".reflet/harness/runs",
  ".reflet/strategy",
  ".reflet/codebase",
  ".reflet/market",
  ".reflet/audience",
  ".reflet/user-research",
  ".reflet/use-cases",
  ".reflet/analytics",
  ".reflet/delivery",
  ".reflet/tasks",
  ".reflet/evidence",
] as const;
