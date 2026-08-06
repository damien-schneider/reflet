import type { Id } from "@reflet/backend/convex/_generated/dataModel";

export interface SuggestedMonitor {
  accepted: boolean;
  method?: string;
  name: string;
  url: string;
}

export interface SuggestedKeyword {
  accepted: boolean;
  category: string;
  keyword: string;
}

export interface SuggestedTag {
  accepted: boolean;
  color: string;
  name: string;
}

export interface ChangelogConfig {
  hasConventionalCommits?: boolean;
  importExisting: boolean;
  releaseCount?: number;
  syncDirection: string;
  targetBranch: string;
  versionPrefix: string;
  workflow: "ai_powered" | "automated" | "manual";
}

export interface SuggestedPrompt {
  prompt: string;
  title: string;
}

export interface SetupData {
  _id: Id<"projectSetupResults">;
  changelogConfig?: ChangelogConfig;
  projectOverview?: string;
  suggestedKeywords?: SuggestedKeyword[];
  suggestedMonitors?: SuggestedMonitor[];
  suggestedPrompts?: SuggestedPrompt[];
  suggestedTags?: SuggestedTag[];
}
