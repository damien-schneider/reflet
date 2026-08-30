import type { api } from "@reflet/backend/convex/_generated/api";
import type { FunctionReturnType } from "convex/server";

export type SetupData = NonNullable<
  FunctionReturnType<
    typeof api.integrations.github.project_setup.getProjectSetup
  >
>;

export type ChangelogConfig = NonNullable<SetupData["changelogConfig"]>;
export type SuggestedKeyword = NonNullable<
  SetupData["suggestedKeywords"]
>[number];
export type SuggestedMonitor = NonNullable<
  SetupData["suggestedMonitors"]
>[number];
export type SuggestedPrompt = NonNullable<
  SetupData["suggestedPrompts"]
>[number];
export type SuggestedTag = NonNullable<SetupData["suggestedTags"]>[number];
