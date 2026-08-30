import type { VersionIncrement } from "./release-settings/types";

export type Workflow = "ai_powered" | "automated" | "manual";

export type SyncDirection =
  | "github_first"
  | "reflet_first"
  | "bidirectional"
  | "none";

export interface SyncSettings {
  autoPublishImported: boolean;
  autoSyncReleases: boolean;
  pushToGithubOnPublish: boolean;
}

export interface WizardConfig extends SyncSettings {
  autoVersioning: boolean;
  manualSyncDirection: SyncDirection;
  manualSyncEnabled: boolean;
  targetBranch: string;
  versionIncrement: VersionIncrement;
  versionPrefix: string;
  workflow: Workflow;
}

const WORKFLOW_SYNC: Record<Workflow, SyncSettings> = {
  ai_powered: {
    autoPublishImported: true,
    autoSyncReleases: false,
    pushToGithubOnPublish: true,
  },
  automated: {
    autoPublishImported: false,
    autoSyncReleases: true,
    pushToGithubOnPublish: false,
  },
  manual: {
    autoPublishImported: false,
    autoSyncReleases: false,
    pushToGithubOnPublish: false,
  },
};

const DIRECTION_SYNC: Record<
  SyncDirection,
  Pick<SyncSettings, "autoSyncReleases" | "pushToGithubOnPublish">
> = {
  bidirectional: { autoSyncReleases: true, pushToGithubOnPublish: true },
  github_first: { autoSyncReleases: true, pushToGithubOnPublish: false },
  none: { autoSyncReleases: false, pushToGithubOnPublish: false },
  reflet_first: { autoSyncReleases: false, pushToGithubOnPublish: true },
};

export const DEFAULT_CONFIG: WizardConfig = {
  autoPublishImported: true,
  autoSyncReleases: false,
  autoVersioning: true,
  manualSyncDirection: "bidirectional",
  manualSyncEnabled: false,
  pushToGithubOnPublish: true,
  targetBranch: "main",
  versionIncrement: "patch",
  versionPrefix: "v",
  workflow: "ai_powered",
};

export const applyWorkflowDefaults = (workflow: Workflow): SyncSettings =>
  WORKFLOW_SYNC[workflow];

export const resolveSyncSettings = (config: WizardConfig): SyncSettings => {
  const usesManualDirection =
    config.workflow === "manual" && config.manualSyncEnabled;

  if (!usesManualDirection) {
    return {
      autoPublishImported: config.autoPublishImported,
      autoSyncReleases: config.autoSyncReleases,
      pushToGithubOnPublish: config.pushToGithubOnPublish,
    };
  }

  return {
    autoPublishImported: config.autoPublishImported,
    ...DIRECTION_SYNC[config.manualSyncDirection],
  };
};
