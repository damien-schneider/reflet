import { afterEach, describe, expect, test, vi } from "vitest";
import { builtinAdapter } from "../adapters/builtin";
import { claudeCodeAdapter } from "../adapters/claude_code";
import { codexAdapter } from "../adapters/codex";
import { copilotAdapter } from "../adapters/copilot";
import { getAdapter } from "../adapters/registry";
import type { CodingAdapter } from "../adapters/types";

const failureLog = "backend check failed\nType error in adapter";

const pullRequest = {
  body: "Fixes #42",
  draft: true,
  head: { ref: "autopilot-branch" },
  html_url: "https://github.com/acme/reflet/pull/7",
  number: 7,
  state: "open",
  title: "Autopilot PR #42",
};

const wrongPullRequest = {
  ...pullRequest,
  body: "Fixes #420",
  html_url: "https://github.com/acme/reflet/pull/420",
  number: 420,
  title: "Autopilot PR #420",
};

interface AdapterCase {
  adapter: CodingAdapter;
  credentials: Record<string, string>;
  externalRef: string;
}

const adapterCases: AdapterCase[] = [
  {
    adapter: codexAdapter,
    credentials: { githubToken: "github-token" },
    externalRef: "codex:acme/reflet#42",
  },
  {
    adapter: claudeCodeAdapter,
    credentials: { githubToken: "github-token" },
    externalRef: "claude:acme/reflet#42",
  },
  {
    adapter: copilotAdapter,
    credentials: { githubPat: "github-token" },
    externalRef: "copilot:acme/reflet#42",
  },
];

const getRequestUrl = (input: Parameters<typeof fetch>[0]): string => {
  if (typeof input === "string") {
    return input;
  }

  if (input instanceof URL) {
    return input.href;
  }

  return input.url;
};

const jsonResponse = (body: unknown) => Response.json(body);

const createGitHubFetchStub = (): typeof fetch => async (input) => {
  const url = getRequestUrl(input);

  if (url.includes("/issues/42/comments")) {
    return jsonResponse([]);
  }

  if (url.includes("/pulls?")) {
    return jsonResponse([pullRequest]);
  }

  if (url.includes("/check-runs")) {
    return jsonResponse({
      check_runs: [
        {
          conclusion: "failure",
          output: { summary: failureLog },
          status: "completed",
        },
        {
          conclusion: null,
          status: "in_progress",
        },
      ],
    });
  }

  throw new Error(`Unexpected GitHub request: ${url}`);
};

const createFailingPrListFetchStub = (): typeof fetch => async (input) => {
  const url = getRequestUrl(input);

  if (url.includes("/issues/42/comments")) {
    return jsonResponse([]);
  }

  if (url.includes("/pulls?")) {
    return new Response("Bad credentials", { status: 401 });
  }

  throw new Error(`Unexpected GitHub request: ${url}`);
};

const createMalformedPrListFetchStub = (): typeof fetch => async (input) => {
  const url = getRequestUrl(input);

  if (url.includes("/issues/42/comments")) {
    return jsonResponse([]);
  }

  if (url.includes("/pulls?")) {
    return jsonResponse({ items: [pullRequest] });
  }

  throw new Error(`Unexpected GitHub request: ${url}`);
};

const createWrongIssuePrFetchStub = (): typeof fetch => async (input) => {
  const url = getRequestUrl(input);

  if (url.includes("/issues/42/comments")) {
    return jsonResponse([]);
  }

  if (url.includes("/pulls?")) {
    return jsonResponse([wrongPullRequest]);
  }

  if (url.includes("/actions/runs")) {
    return jsonResponse({ workflow_runs: [] });
  }

  throw new Error(`Unexpected GitHub request: ${url}`);
};

const createBuiltinSuccessFetchStub = (): typeof fetch => async (input) => {
  const url = getRequestUrl(input);

  if (url.includes("/git/refs/heads/main")) {
    return jsonResponse({ object: { sha: "base-sha" } });
  }

  if (url.includes("/git/refs")) {
    return jsonResponse({});
  }

  if (url.includes("/contents/?ref=main")) {
    return jsonResponse([
      { name: "AGENTS.md", path: "AGENTS.md", type: "file" },
    ]);
  }

  if (url.includes("/contents/AGENTS.md?ref=main")) {
    return jsonResponse({ content: btoa("Follow project rules."), sha: "sha" });
  }

  if (url.includes("/search/code")) {
    return jsonResponse({ items: [] });
  }

  if (url.includes("/pulls")) {
    return jsonResponse({
      html_url: "https://github.com/acme/reflet/pull/9",
      number: 9,
    });
  }

  throw new Error(`Unexpected GitHub request: ${url}`);
};

afterEach(function restoreFetch() {
  vi.unstubAllGlobals();
});

describe("coding adapter CI status", () => {
  for (const adapterCase of adapterCases) {
    test(`${adapterCase.adapter.name} returns failed when any CI check fails`, async () => {
      vi.stubGlobal("fetch", createGitHubFetchStub());

      const result = await adapterCase.adapter.getStatus(
        adapterCase.externalRef,
        adapterCase.credentials
      );

      expect(result.status).toBe("failed");
      expect(result.ciStatus).toBe("failed");
      expect(result.ciFailureLog).toBe(failureLog);
      expect(result.prNumber).toBe(7);
      expect(result.prUrl).toBe(pullRequest.html_url);
    });
  }

  for (const adapterCase of adapterCases) {
    test(`${adapterCase.adapter.name} keeps polling when PR status cannot be checked`, async () => {
      vi.stubGlobal("fetch", createFailingPrListFetchStub());

      const result = await adapterCase.adapter.getStatus(
        adapterCase.externalRef,
        adapterCase.credentials
      );

      expect(result.status).toBe("running");
      expect(result.activityLogs[0]?.level).toBe("warning");
      expect(result.activityLogs[0]?.message).toContain(
        "Could not check PR status"
      );
    });
  }

  for (const adapterCase of adapterCases) {
    test(`${adapterCase.adapter.name} keeps polling when GitHub returns malformed PR data`, async () => {
      vi.stubGlobal("fetch", createMalformedPrListFetchStub());

      const result = await adapterCase.adapter.getStatus(
        adapterCase.externalRef,
        adapterCase.credentials
      );

      expect(result.status).toBe("running");
      expect(
        result.activityLogs.some(
          (entry) =>
            entry.level === "warning" &&
            entry.message.includes("Could not parse PR list response")
        )
      ).toBe(true);
    });
  }

  for (const adapterCase of adapterCases) {
    test(`${adapterCase.adapter.name} does not match issue number substrings`, async () => {
      vi.stubGlobal("fetch", createWrongIssuePrFetchStub());

      const result = await adapterCase.adapter.getStatus(
        adapterCase.externalRef,
        adapterCase.credentials
      );

      expect(result.status).toBe("running");
      expect(result.prNumber).toBeUndefined();
    });
  }

  test("built-in adapter does not report spec-only PRs as successful work", async () => {
    vi.stubGlobal("fetch", createBuiltinSuccessFetchStub());

    const result = await builtinAdapter.executeTask(
      {
        acceptanceCriteria: ["Real implementation exists"],
        agentsMdContent: "Follow project rules.",
        baseBranch: "main",
        featureBranch: "autopilot/test-task",
        repoUrl: "https://github.com/acme/reflet",
        technicalSpec: "Implement the feature, not only a plan.",
        title: "Build production feature",
      },
      { githubToken: "github-token" }
    );

    expect(result.status).toBe("failed");
    expect(result.errorMessage).toContain("does not implement code");
  });

  test("unimplemented external adapters fail explicitly instead of falling back to built-in", async () => {
    expect(getAdapter("open_swe").displayName).toContain("not configured");
    expect(getAdapter("openclaw").displayName).toContain("not configured");
  });
});
