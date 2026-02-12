import { describe, expect, it } from "vitest";
import type { WizardConfig } from "../release-setup-wizard";
import {
  generateAiPrompt,
  generateAutoReleaseWorkflowYaml,
  generateCombinedWorkflowYaml,
  generateWorkflowYaml,
} from "./setup-generators";

const makeConfig = (overrides: Partial<WizardConfig> = {}): WizardConfig => ({
  workflow: "ai_powered",
  syncDirection: "reflet_first",
  autoSyncReleases: false,
  pushToGithubOnPublish: true,
  autoPublishImported: true,
  autoVersioning: true,
  versionPrefix: "v",
  versionIncrement: "patch",
  targetBranch: "main",
  manualSyncEnabled: false,
  manualSyncDirection: "bidirectional",
  ...overrides,
});

const DEFAULT_WEBHOOK = "https://app.reflet.dev/api/github/webhook";
const DEFAULT_SLUG = "my-org";
const DEFAULT_BRANCH = "main";

const makePromptOptions = (
  configOverrides: Partial<WizardConfig> = {},
  extra: Partial<{
    repoFullName: string;
    defaultBranch: string;
    webhookUrl: string;
    orgSlug: string;
  }> = {}
) => {
  const config = makeConfig(configOverrides);
  const webhookUrl = extra.webhookUrl ?? DEFAULT_WEBHOOK;
  return {
    repoFullName: extra.repoFullName ?? "owner/repo",
    defaultBranch: extra.defaultBranch ?? config.targetBranch,
    webhookUrl,
    workflowYaml: generateWorkflowYaml(
      webhookUrl,
      extra.defaultBranch ?? config.targetBranch
    ),
    config,
    orgSlug: extra.orgSlug ?? DEFAULT_SLUG,
  };
};

describe("generateWorkflowYaml", () => {
  it("should contain the webhook URL in curl commands", () => {
    const yaml = generateWorkflowYaml(DEFAULT_WEBHOOK, DEFAULT_BRANCH);
    expect(yaml).toContain(DEFAULT_WEBHOOK);
  });

  it("should use the correct branch name", () => {
    const yaml = generateWorkflowYaml(DEFAULT_WEBHOOK, "develop");
    expect(yaml).toContain("- develop");
  });

  it("should include both release and push event handlers", () => {
    const yaml = generateWorkflowYaml(DEFAULT_WEBHOOK, DEFAULT_BRANCH);
    expect(yaml).toContain("release:");
    expect(yaml).toContain("push:");
    expect(yaml).toContain("Notify Reflet of release");
    expect(yaml).toContain("Notify Reflet of changelog update");
  });

  it("should contain GitHub Actions expressions", () => {
    const yaml = generateWorkflowYaml(DEFAULT_WEBHOOK, DEFAULT_BRANCH);
    expect(yaml).toContain("${{");
    expect(yaml).toContain("github.event.action");
  });

  it("should be valid YAML structure", () => {
    const yaml = generateWorkflowYaml(DEFAULT_WEBHOOK, DEFAULT_BRANCH);
    expect(yaml).toContain("name:");
    expect(yaml).toContain("on:");
    expect(yaml).toContain("jobs:");
    expect(yaml).toContain("runs-on: ubuntu-latest");
  });

  it("should watch for CHANGELOG.md pushes", () => {
    const yaml = generateWorkflowYaml(DEFAULT_WEBHOOK, DEFAULT_BRANCH);
    expect(yaml).toContain("CHANGELOG.md");
  });

  it("should handle branch names with slashes", () => {
    const yaml = generateWorkflowYaml(DEFAULT_WEBHOOK, "release/v1");
    expect(yaml).toContain("- release/v1");
  });
});

describe("generateAutoReleaseWorkflowYaml", () => {
  it("should target the correct branch", () => {
    const yaml = generateAutoReleaseWorkflowYaml("develop", "v");
    expect(yaml).toContain("- develop");
  });

  it("should include release-please action reference", () => {
    const yaml = generateAutoReleaseWorkflowYaml(DEFAULT_BRANCH, "v");
    expect(yaml).toContain("googleapis/release-please-action@v4");
  });

  it("should set include-v-in-tag: true when prefix is v", () => {
    const yaml = generateAutoReleaseWorkflowYaml(DEFAULT_BRANCH, "v");
    expect(yaml).toContain("include-v-in-tag: true");
  });

  it("should set include-v-in-tag: false when prefix is not v", () => {
    const yaml = generateAutoReleaseWorkflowYaml(DEFAULT_BRANCH, "release-");
    expect(yaml).toContain("include-v-in-tag: false");
  });

  it("should NOT include include-v-in-tag when prefix is empty", () => {
    const yaml = generateAutoReleaseWorkflowYaml(DEFAULT_BRANCH, "");
    expect(yaml).not.toContain("include-v-in-tag");
  });

  it("should include proper permissions", () => {
    const yaml = generateAutoReleaseWorkflowYaml(DEFAULT_BRANCH, "v");
    expect(yaml).toContain("contents: write");
    expect(yaml).toContain("pull-requests: write");
  });
});

describe("generateCombinedWorkflowYaml", () => {
  it("should contain both workflow YAMLs separated by ---", () => {
    const combined = generateCombinedWorkflowYaml(
      DEFAULT_WEBHOOK,
      DEFAULT_BRANCH,
      "v"
    );
    expect(combined).toContain("---");
  });

  it("should include file path comments for each workflow", () => {
    const combined = generateCombinedWorkflowYaml(
      DEFAULT_WEBHOOK,
      DEFAULT_BRANCH,
      "v"
    );
    expect(combined).toContain("reflet-release-sync.yml");
    expect(combined).toContain("release-please.yml");
  });

  it("should contain both the sync and release-please workflows", () => {
    const combined = generateCombinedWorkflowYaml(
      DEFAULT_WEBHOOK,
      DEFAULT_BRANCH,
      "v"
    );
    expect(combined).toContain("Notify Reflet of release");
    expect(combined).toContain("release-please-action");
  });
});

describe("generateAiPrompt", () => {
  describe("AI-Powered workflow", () => {
    it("should mention AI-powered in the prompt", () => {
      const prompt = generateAiPrompt(
        makePromptOptions({ workflow: "ai_powered" })
      );
      expect(prompt.toLowerCase()).toContain("ai");
    });

    it("should include the webhook URL", () => {
      const prompt = generateAiPrompt(
        makePromptOptions({ workflow: "ai_powered" })
      );
      expect(prompt).toContain(DEFAULT_WEBHOOK);
    });

    it("should include the org slug", () => {
      const prompt = generateAiPrompt(
        makePromptOptions({ workflow: "ai_powered" })
      );
      expect(prompt).toContain(DEFAULT_SLUG);
    });

    it("should include version info when autoVersioning is enabled", () => {
      const prompt = generateAiPrompt(
        makePromptOptions({
          workflow: "ai_powered",
          autoVersioning: true,
          versionPrefix: "v",
          versionIncrement: "patch",
        })
      );
      expect(prompt).toContain("SemVer");
      expect(prompt).toContain("patch");
    });

    it("should say disabled when autoVersioning is off", () => {
      const prompt = generateAiPrompt(
        makePromptOptions({ workflow: "ai_powered", autoVersioning: false })
      );
      expect(prompt).toContain("disabled");
    });

    it("should instruct to create reflet-release-sync.yml", () => {
      const prompt = generateAiPrompt(
        makePromptOptions({ workflow: "ai_powered" })
      );
      expect(prompt).toContain("reflet-release-sync.yml");
    });

    it("should NOT include release-please instructions", () => {
      const prompt = generateAiPrompt(
        makePromptOptions({ workflow: "ai_powered" })
      );
      expect(prompt).not.toContain("release-please.yml");
    });

    it("should mention push-to-GitHub differently when disabled", () => {
      const enabled = generateAiPrompt(
        makePromptOptions({
          workflow: "ai_powered",
          pushToGithubOnPublish: true,
        })
      );
      const disabled = generateAiPrompt(
        makePromptOptions({
          workflow: "ai_powered",
          pushToGithubOnPublish: false,
        })
      );
      expect(enabled).not.toBe(disabled);
    });

    it("should include the repo full name", () => {
      const prompt = generateAiPrompt(
        makePromptOptions({}, { repoFullName: "acme/widget" })
      );
      expect(prompt).toContain("acme/widget");
    });

    it("should instruct not to modify webhook URL", () => {
      const prompt = generateAiPrompt(
        makePromptOptions({ workflow: "ai_powered" })
      );
      expect(prompt.toLowerCase()).toContain("do not modify");
    });
  });

  describe("Automated workflow", () => {
    it("should include BOTH workflow files", () => {
      const prompt = generateAiPrompt(
        makePromptOptions({ workflow: "automated" })
      );
      expect(prompt).toContain("reflet-release-sync.yml");
      expect(prompt).toContain("release-please.yml");
    });

    it("should include conventional commit documentation", () => {
      const prompt = generateAiPrompt(
        makePromptOptions({ workflow: "automated" })
      );
      expect(prompt.toLowerCase()).toContain("conventional");
    });

    it("should mention feat:, fix:, chore:, feat!: patterns", () => {
      const prompt = generateAiPrompt(
        makePromptOptions({ workflow: "automated" })
      );
      expect(prompt).toContain("feat:");
      expect(prompt).toContain("fix:");
      expect(prompt).toContain("chore:");
      expect(prompt).toContain("feat!:");
    });

    it("should include version prefix", () => {
      const prompt = generateAiPrompt(
        makePromptOptions({ workflow: "automated", versionPrefix: "release-" })
      );
      expect(prompt).toContain("release-");
    });

    it("should mention both workflows use built-in token", () => {
      const prompt = generateAiPrompt(
        makePromptOptions({ workflow: "automated" })
      );
      expect(prompt).toContain("$GITHUB_TOKEN");
    });
  });

  describe("Manual workflow with sync disabled", () => {
    it("should say no GitHub setup needed", () => {
      const prompt = generateAiPrompt(
        makePromptOptions({ workflow: "manual", manualSyncEnabled: false })
      );
      expect(prompt.toLowerCase()).toContain("no github setup needed");
    });

    it("should mention Settings for later setup", () => {
      const prompt = generateAiPrompt(
        makePromptOptions({ workflow: "manual", manualSyncEnabled: false })
      );
      expect(prompt).toContain("Settings");
      expect(prompt).toContain("Releases");
    });

    it("should NOT include any workflow YAML", () => {
      const prompt = generateAiPrompt(
        makePromptOptions({ workflow: "manual", manualSyncEnabled: false })
      );
      expect(prompt).not.toContain("reflet-release-sync.yml");
      expect(prompt).not.toContain("release-please.yml");
    });
  });

  describe("Manual workflow with sync enabled", () => {
    it("should include workflow YAML instructions", () => {
      const prompt = generateAiPrompt(
        makePromptOptions({
          workflow: "manual",
          manualSyncEnabled: true,
          manualSyncDirection: "github_first",
        })
      );
      expect(prompt).toContain("reflet-release-sync.yml");
    });

    it("should describe github_first direction correctly", () => {
      const prompt = generateAiPrompt(
        makePromptOptions({
          workflow: "manual",
          manualSyncEnabled: true,
          manualSyncDirection: "github_first",
        })
      );
      expect(prompt).toContain("GitHub");
      expect(prompt).toContain("Reflet");
    });

    it("should describe bidirectional direction correctly", () => {
      const prompt = generateAiPrompt(
        makePromptOptions({
          workflow: "manual",
          manualSyncEnabled: true,
          manualSyncDirection: "bidirectional",
        })
      );
      expect(prompt.toLowerCase()).toContain("bidirectional");
    });

    it("should describe reflet_first direction correctly", () => {
      const prompt = generateAiPrompt(
        makePromptOptions({
          workflow: "manual",
          manualSyncEnabled: true,
          manualSyncDirection: "reflet_first",
        })
      );
      expect(prompt).toContain("Reflet");
    });
  });

  describe("Edge cases", () => {
    it("should handle webhook URL with query params", () => {
      const prompt = generateAiPrompt(
        makePromptOptions(
          {},
          { webhookUrl: "https://example.com/api/webhook?token=abc" }
        )
      );
      expect(prompt).toContain("https://example.com/api/webhook?token=abc");
    });

    it("should handle very long org slug", () => {
      const longSlug = "a".repeat(200);
      const prompt = generateAiPrompt(
        makePromptOptions({}, { orgSlug: longSlug })
      );
      expect(prompt).toContain(longSlug);
    });
  });
});
