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

const RELEASE_PLEASE_ACTION_V4_INPUTS = [
  "token",
  "release-type",
  "path",
  "target-branch",
  "config-file",
  "manifest-file",
  "repo-url",
  "github-api-url",
  "github-graphql-url",
  "fork",
  "include-component-in-tag",
  "proxy-server",
  "skip-github-release",
  "skip-github-pull-request",
  "skip-labeling",
  "changelog-host",
  "versioning-strategy",
  "release-as",
];

describe("generated setup content", () => {
  it("never interpolates GitHub expressions into shell commands", () => {
    const generated = [
      generateAutoReleaseWorkflowYaml("main"),
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
    const yaml = generateAutoReleaseWorkflowYaml("develop");
    expect(yaml).toContain("- develop");
    expect(yaml).toContain("target-branch: develop");
  });

  it("only passes inputs release-please-action@v4 accepts", () => {
    const [, withBlock = ""] =
      generateAutoReleaseWorkflowYaml("main").split("with:\n");
    const inputNames = withBlock
      .split("\n")
      .filter((line) => line.trim() !== "")
      .map((line) => line.trim().split(":")[0]);

    expect(inputNames.length).toBeGreaterThan(0);
    for (const inputName of inputNames) {
      expect(RELEASE_PLEASE_ACTION_V4_INPUTS).toContain(inputName);
    }
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
