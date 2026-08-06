import { v } from "convex/values";

export const SETUP_STEPS = [
  { key: "analyze_codebase", label: "Analyzing codebase" },
  { key: "discover_services", label: "Discovering services" },
  { key: "extract_keywords", label: "Extracting market keywords" },
  { key: "configure_changelog", label: "Configuring changelog" },
  { key: "suggest_tags", label: "Suggesting tags" },
  { key: "generate_prompts", label: "Generating AI context" },
] as const;

export const setupStatusValidator = v.union(
  v.literal("idle"),
  v.literal("analyzing"),
  v.literal("review"),
  v.literal("completed"),
  v.literal("error")
);

export const stepStatusValidator = v.union(
  v.literal("pending"),
  v.literal("running"),
  v.literal("done"),
  v.literal("error")
);

export const changelogConfigValidator = v.object({
  hasConventionalCommits: v.optional(v.boolean()),
  importExisting: v.boolean(),
  releaseCount: v.optional(v.number()),
  syncDirection: v.string(),
  targetBranch: v.string(),
  versionPrefix: v.string(),
  workflow: v.union(
    v.literal("ai_powered"),
    v.literal("automated"),
    v.literal("manual")
  ),
});

export const suggestedKeywordsValidator = v.array(
  v.object({
    accepted: v.boolean(),
    category: v.string(),
    keyword: v.string(),
  })
);

export const suggestedMonitorsValidator = v.array(
  v.object({
    accepted: v.boolean(),
    method: v.optional(v.string()),
    name: v.string(),
    url: v.string(),
  })
);

export const suggestedPromptsValidator = v.array(
  v.object({
    prompt: v.string(),
    title: v.string(),
  })
);

export const suggestedTagsValidator = v.array(
  v.object({
    accepted: v.boolean(),
    color: v.string(),
    name: v.string(),
  })
);

export const projectSetupResultValidator = v.object({
  _creationTime: v.number(),
  _id: v.id("projectSetupResults"),
  changelogConfig: v.optional(changelogConfigValidator),
  completedAt: v.optional(v.number()),
  createdAt: v.number(),
  error: v.optional(v.string()),
  githubConnectionId: v.id("githubConnections"),
  organizationId: v.id("organizations"),
  projectOverview: v.optional(v.string()),
  status: setupStatusValidator,
  steps: v.array(
    v.object({
      error: v.optional(v.string()),
      key: v.string(),
      label: v.string(),
      status: stepStatusValidator,
      summary: v.optional(v.string()),
    })
  ),
  suggestedKeywords: v.optional(suggestedKeywordsValidator),
  suggestedMonitors: v.optional(suggestedMonitorsValidator),
  suggestedPrompts: v.optional(suggestedPromptsValidator),
  suggestedTags: v.optional(suggestedTagsValidator),
  updatedAt: v.number(),
});
