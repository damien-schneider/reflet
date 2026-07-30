import { describe, expect, test } from "vitest";

// Types replicated from release-setup-wizard.tsx for testing pure logic
type Workflow = "ai_powered" | "automated" | "manual";

type SyncDirection = "github_first" | "reflet_first" | "bidirectional" | "none";

interface WizardConfig {
  autoPublishImported: boolean;
  autoSyncReleases: boolean;
  manualSyncDirection: SyncDirection;
  manualSyncEnabled: boolean;
  pushToGithubOnPublish: boolean;
  syncDirection: SyncDirection;
  workflow: Workflow;
}

// Extracted pure logic from handleWorkflowChange in release-setup-wizard.tsx
const applyWorkflowDefaults = (workflow: Workflow): Partial<WizardConfig> => {
  const updates: Partial<WizardConfig> = { workflow };

  if (workflow === "ai_powered") {
    updates.syncDirection = "reflet_first";
    updates.autoSyncReleases = false;
    updates.pushToGithubOnPublish = true;
    updates.autoPublishImported = true;
  } else if (workflow === "automated") {
    updates.syncDirection = "github_first";
    updates.autoSyncReleases = true;
    updates.pushToGithubOnPublish = false;
    updates.autoPublishImported = false;
  } else {
    updates.syncDirection = "none";
    updates.autoSyncReleases = false;
    updates.pushToGithubOnPublish = false;
    updates.autoPublishImported = false;
  }

  return updates;
};

// Extracted pure logic from handleComplete in release-setup-wizard.tsx
const resolveConfig = (
  config: WizardConfig
): {
  syncDirection: SyncDirection;
  autoSync: boolean;
  pushToGithub: boolean;
} => {
  const isManualWithSync =
    config.workflow === "manual" && config.manualSyncEnabled;

  const finalSyncDirection = isManualWithSync
    ? config.manualSyncDirection
    : config.syncDirection;

  const finalAutoSync = isManualWithSync
    ? config.manualSyncDirection !== "none"
    : config.autoSyncReleases;

  const finalPushToGithub = isManualWithSync
    ? config.manualSyncDirection === "reflet_first" ||
      config.manualSyncDirection === "bidirectional"
    : config.pushToGithubOnPublish;

  return {
    autoSync: finalAutoSync,
    pushToGithub: finalPushToGithub,
    syncDirection: finalSyncDirection,
  };
};

const buildConfig = (overrides: Partial<WizardConfig> = {}): WizardConfig => ({
  autoPublishImported: false,
  autoSyncReleases: false,
  manualSyncDirection: "none",
  manualSyncEnabled: false,
  pushToGithubOnPublish: false,
  syncDirection: "none",
  workflow: "manual",
  ...overrides,
});

describe("applyWorkflowDefaults", () => {
  test("should set reflet_first sync with push-to-github for ai_powered", () => {
    const result = applyWorkflowDefaults("ai_powered");

    expect(result.syncDirection).toBe("reflet_first");
    expect(result.autoSyncReleases).toBe(false);
    expect(result.pushToGithubOnPublish).toBe(true);
    expect(result.autoPublishImported).toBe(true);
  });

  test("should set github_first sync with auto-sync for automated", () => {
    const result = applyWorkflowDefaults("automated");

    expect(result.syncDirection).toBe("github_first");
    expect(result.autoSyncReleases).toBe(true);
    expect(result.pushToGithubOnPublish).toBe(false);
    expect(result.autoPublishImported).toBe(false);
  });

  test("should disable all sync options for manual", () => {
    const result = applyWorkflowDefaults("manual");

    expect(result.syncDirection).toBe("none");
    expect(result.autoSyncReleases).toBe(false);
    expect(result.pushToGithubOnPublish).toBe(false);
    expect(result.autoPublishImported).toBe(false);
  });
});

describe("resolveConfig", () => {
  describe("ai_powered workflow", () => {
    test("should use config syncDirection directly", () => {
      const config = buildConfig({
        pushToGithubOnPublish: true,
        syncDirection: "reflet_first",
        workflow: "ai_powered",
      });

      const result = resolveConfig(config);

      expect(result.syncDirection).toBe("reflet_first");
      expect(result.autoSync).toBe(false);
      expect(result.pushToGithub).toBe(true);
    });
  });

  describe("automated workflow", () => {
    test("should use github_first with autoSync enabled", () => {
      const config = buildConfig({
        autoSyncReleases: true,
        pushToGithubOnPublish: false,
        syncDirection: "github_first",
        workflow: "automated",
      });

      const result = resolveConfig(config);

      expect(result.syncDirection).toBe("github_first");
      expect(result.autoSync).toBe(true);
      expect(result.pushToGithub).toBe(false);
    });
  });

  describe("manual workflow with sync disabled", () => {
    test("should resolve everything to none/false", () => {
      const config = buildConfig({
        autoSyncReleases: false,
        manualSyncEnabled: false,
        pushToGithubOnPublish: false,
        syncDirection: "none",
        workflow: "manual",
      });

      const result = resolveConfig(config);

      expect(result.syncDirection).toBe("none");
      expect(result.autoSync).toBe(false);
      expect(result.pushToGithub).toBe(false);
    });
  });

  describe("manual workflow with sync enabled", () => {
    test("should use manualSyncDirection for bidirectional", () => {
      const config = buildConfig({
        manualSyncDirection: "bidirectional",
        manualSyncEnabled: true,
        workflow: "manual",
      });

      const result = resolveConfig(config);

      expect(result.syncDirection).toBe("bidirectional");
      expect(result.autoSync).toBe(true);
      expect(result.pushToGithub).toBe(true);
    });

    test("should enable autoSync but not pushToGithub for github_first", () => {
      const config = buildConfig({
        manualSyncDirection: "github_first",
        manualSyncEnabled: true,
        workflow: "manual",
      });

      const result = resolveConfig(config);

      expect(result.syncDirection).toBe("github_first");
      expect(result.autoSync).toBe(true);
      expect(result.pushToGithub).toBe(false);
    });

    test("should enable both autoSync and pushToGithub for reflet_first", () => {
      const config = buildConfig({
        manualSyncDirection: "reflet_first",
        manualSyncEnabled: true,
        workflow: "manual",
      });

      const result = resolveConfig(config);

      expect(result.syncDirection).toBe("reflet_first");
      expect(result.autoSync).toBe(true);
      expect(result.pushToGithub).toBe(true);
    });

    test("should disable autoSync when manualSyncDirection is none", () => {
      const config = buildConfig({
        manualSyncDirection: "none",
        manualSyncEnabled: true,
        workflow: "manual",
      });

      const result = resolveConfig(config);

      expect(result.syncDirection).toBe("none");
      expect(result.autoSync).toBe(false);
      expect(result.pushToGithub).toBe(false);
    });
  });

  describe("edge cases", () => {
    test("should not use manualSyncDirection for non-manual workflows", () => {
      const config = buildConfig({
        manualSyncDirection: "github_first",
        manualSyncEnabled: true,
        syncDirection: "reflet_first",
        workflow: "ai_powered",
      });

      const result = resolveConfig(config);

      // Should use syncDirection, not manualSyncDirection
      expect(result.syncDirection).toBe("reflet_first");
    });

    test("should not use manualSyncDirection for automated workflows", () => {
      const config = buildConfig({
        autoSyncReleases: true,
        manualSyncDirection: "bidirectional",
        manualSyncEnabled: true,
        syncDirection: "github_first",
        workflow: "automated",
      });

      const result = resolveConfig(config);

      expect(result.syncDirection).toBe("github_first");
      expect(result.autoSync).toBe(true);
    });
  });
});
