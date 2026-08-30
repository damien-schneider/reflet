import { describe, expect, it } from "vitest";
import { DEFAULT_CONFIG, type WizardConfig } from "../wizard-config";
import {
  generateAiPrompt,
  generateAutoReleaseWorkflowYaml,
} from "./setup-generators";

const makeConfig = (overrides: Partial<WizardConfig> = {}): WizardConfig => ({
  ...DEFAULT_CONFIG,
  ...overrides,
});

const makePromptOptions = (configOverrides: Partial<WizardConfig> = {}) => {
  const config = makeConfig(configOverrides);
  return {
    appUrl: "https://app.reflet.dev",
    config,
    defaultBranch: config.targetBranch,
    orgSlug: "my-org",
    repoFullName: "owner/repo",
  };
};

const WORKFLOWS: WizardConfig["workflow"][] = [
  "ai_powered",
  "automated",
  "manual",
];

describe("generated setup content", () => {
  it("never interpolates GitHub expressions into shell commands", () => {
    const generated = [
      generateAutoReleaseWorkflowYaml("main", "v"),
      ...WORKFLOWS.map((workflow) =>
        generateAiPrompt(makePromptOptions({ workflow }))
      ),
      generateAiPrompt(
        makePromptOptions({ manualSyncEnabled: true, workflow: "manual" })
      ),
    ];

    for (const content of generated) {
      expect(content).not.toContain("${{");
      expect(content).not.toContain("curl");
    }
  });

  it("never asks the user to create the removed sync workflow", () => {
    for (const workflow of WORKFLOWS) {
      const prompt = generateAiPrompt(makePromptOptions({ workflow }));
      expect(prompt).not.toContain("reflet-release-sync.yml");
    }
  });
});

describe("generateAutoReleaseWorkflowYaml", () => {
  it("targets the given branch", () => {
    expect(generateAutoReleaseWorkflowYaml("develop", "v")).toContain(
      "- develop"
    );
  });

  it("includes the v tag prefix only when the prefix is v", () => {
    expect(generateAutoReleaseWorkflowYaml("main", "v")).toContain(
      "include-v-in-tag: true"
    );
    expect(generateAutoReleaseWorkflowYaml("main", "release-")).toContain(
      "include-v-in-tag: false"
    );
    expect(generateAutoReleaseWorkflowYaml("main", "")).not.toContain(
      "include-v-in-tag"
    );
  });
});

describe("generateAiPrompt", () => {
  it("documents conventional commits only for the automated workflow", () => {
    expect(
      generateAiPrompt(makePromptOptions({ workflow: "automated" }))
    ).toContain("feat!:");
    expect(
      generateAiPrompt(makePromptOptions({ workflow: "ai_powered" }))
    ).not.toContain("feat!:");
  });

  it("ships the release-please file only for the automated workflow", () => {
    expect(
      generateAiPrompt(makePromptOptions({ workflow: "automated" }))
    ).toContain("release-please.yml");
    expect(
      generateAiPrompt(makePromptOptions({ workflow: "ai_powered" }))
    ).not.toContain("release-please.yml");
  });

  it("reports auto-versioning state", () => {
    expect(
      generateAiPrompt(makePromptOptions({ autoVersioning: true }))
    ).toContain("SemVer");
    expect(
      generateAiPrompt(makePromptOptions({ autoVersioning: false }))
    ).toContain("disabled");
  });

  it("tells a manual org with sync off that nothing is needed", () => {
    const prompt = generateAiPrompt(
      makePromptOptions({ manualSyncEnabled: false, workflow: "manual" })
    );
    expect(prompt).toContain("No GitHub setup needed");
  });
});
