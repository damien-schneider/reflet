import { describe, expect, test } from "vitest";
import {
  applyWorkflowDefaults,
  DEFAULT_CONFIG,
  resolveSyncSettings,
  type SyncDirection,
  type WizardConfig,
} from "./wizard-config";

const manualConfig = (manualSyncDirection: SyncDirection): WizardConfig => ({
  ...DEFAULT_CONFIG,
  ...applyWorkflowDefaults("manual"),
  manualSyncDirection,
  manualSyncEnabled: true,
  workflow: "manual",
});

describe("applyWorkflowDefaults", () => {
  test("ai_powered pushes to GitHub without importing back", () => {
    expect(applyWorkflowDefaults("ai_powered")).toEqual({
      autoPublishImported: true,
      autoSyncReleases: false,
      pushToGithubOnPublish: true,
    });
  });

  test("automated imports from GitHub without pushing back", () => {
    expect(applyWorkflowDefaults("automated")).toEqual({
      autoPublishImported: false,
      autoSyncReleases: true,
      pushToGithubOnPublish: false,
    });
  });

  test("manual syncs nothing until a direction is chosen", () => {
    expect(applyWorkflowDefaults("manual")).toEqual({
      autoPublishImported: false,
      autoSyncReleases: false,
      pushToGithubOnPublish: false,
    });
  });
});

describe("resolveSyncSettings", () => {
  test("reflet_first pushes to GitHub but does not import from it", () => {
    const sync = resolveSyncSettings(manualConfig("reflet_first"));

    expect(sync.pushToGithubOnPublish).toBe(true);
    expect(sync.autoSyncReleases).toBe(false);
  });

  test("github_first imports from GitHub but does not push to it", () => {
    const sync = resolveSyncSettings(manualConfig("github_first"));

    expect(sync.pushToGithubOnPublish).toBe(false);
    expect(sync.autoSyncReleases).toBe(true);
  });

  test("bidirectional enables both", () => {
    const sync = resolveSyncSettings(manualConfig("bidirectional"));

    expect(sync.pushToGithubOnPublish).toBe(true);
    expect(sync.autoSyncReleases).toBe(true);
  });

  test("none disables both", () => {
    const sync = resolveSyncSettings(manualConfig("none"));

    expect(sync.pushToGithubOnPublish).toBe(false);
    expect(sync.autoSyncReleases).toBe(false);
  });

  test("ignores the manual direction when manual sync is off", () => {
    const sync = resolveSyncSettings({
      ...manualConfig("bidirectional"),
      manualSyncEnabled: false,
    });

    expect(sync.pushToGithubOnPublish).toBe(false);
    expect(sync.autoSyncReleases).toBe(false);
  });

  test("ignores the manual direction for non-manual workflows", () => {
    const sync = resolveSyncSettings({
      ...DEFAULT_CONFIG,
      ...applyWorkflowDefaults("ai_powered"),
      manualSyncDirection: "github_first",
      manualSyncEnabled: true,
      workflow: "ai_powered",
    });

    expect(sync.pushToGithubOnPublish).toBe(true);
    expect(sync.autoSyncReleases).toBe(false);
  });
});
