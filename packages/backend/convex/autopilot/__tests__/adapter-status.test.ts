import { afterEach, describe, expect, test, vi } from "vitest";
import { builtinAdapter } from "../adapters/builtin";
import { buildHeaders } from "../adapters/builtin_github";
import { claudeCodeAdapter } from "../adapters/claude_code";
import { codexAdapter } from "../adapters/codex";
import { copilotAdapter } from "../adapters/copilot";
import { getAdapter } from "../adapters/registry";
import type { CodingAdapter } from "../adapters/types";

const failureLog = "backend check failed\nType error in adapter";

const pullRequest = {
  body: "Fixes #42",
  draft: true,
  head: { ref: "feature/branch-with-slash", sha: "head-sha" },
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

const closedPullRequest = {
  ...pullRequest,
  draft: false,
  state: "closed",
};

const readyPullRequest = {
  ...pullRequest,
  draft: false,
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

const createPassedCiFetchStub =
  (linkedPullRequest = readyPullRequest): typeof fetch =>
  async (input) => {
    const url = getRequestUrl(input);

    if (url.includes("/issues/42/comments")) {
      return jsonResponse([]);
    }

    if (url.includes("/pulls?")) {
      return jsonResponse([linkedPullRequest]);
    }

    if (url.includes("/check-runs")) {
      return jsonResponse({
        check_runs: [{ conclusion: "success", status: "completed" }],
      });
    }

    throw new Error(`Unexpected GitHub request: ${url}`);
  };

const providerErrorBody =
  '{"message":"Bad credentials","token":"ghp_secret_token"}';

const createFailingPrListFetchStub = (): typeof fetch => async (input) => {
  const url = getRequestUrl(input);

  if (url.includes("/issues/42/comments")) {
    return jsonResponse([]);
  }

  if (url.includes("/pulls?")) {
    return new Response(providerErrorBody, { status: 401 });
  }

  throw new Error(`Unexpected GitHub request: ${url}`);
};

const createIssueCreationFailureFetchStub =
  (): typeof fetch => async (input) => {
    const url = getRequestUrl(input);

    if (url.includes("/issues")) {
      return new Response(providerErrorBody, { status: 401 });
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

const createClosedUnmergedPrFetchStub = (): typeof fetch => async (input) => {
  const url = getRequestUrl(input);

  if (url.includes("/issues/42/comments")) {
    return jsonResponse([]);
  }

  if (url.includes("/pulls/7")) {
    return jsonResponse({ ...closedPullRequest, merged: false });
  }

  if (url.includes("/pulls?")) {
    return jsonResponse([closedPullRequest]);
  }

  throw new Error(`Unexpected GitHub request: ${url}`);
};

const createClosedMergeLookupFailurePrFetchStub =
  (): typeof fetch => async (input) => {
    const url = getRequestUrl(input);

    if (url.includes("/issues/42/comments")) {
      return jsonResponse([]);
    }

    if (url.includes("/pulls/7")) {
      return new Response("Rate limited", { status: 403 });
    }

    if (url.includes("/pulls?")) {
      return jsonResponse([closedPullRequest]);
    }

    throw new Error(`Unexpected GitHub request: ${url}`);
  };

const createBuiltinClosedUnmergedPrFetchStub =
  (): typeof fetch => async (input) => {
    const url = getRequestUrl(input);

    if (url.includes("/pulls/7")) {
      return jsonResponse({ ...closedPullRequest, merged: false });
    }

    throw new Error(`Unexpected GitHub request: ${url}`);
  };

const createBuiltinPrLookupFailureFetchStub =
  (): typeof fetch => async (input) => {
    const url = getRequestUrl(input);

    if (url.includes("/pulls/7")) {
      return new Response(providerErrorBody, { status: 401 });
    }

    throw new Error(`Unexpected GitHub request: ${url}`);
  };

const createBuiltinPassedCiFetchStub = (): typeof fetch => async (input) => {
  const url = getRequestUrl(input);

  if (url.includes("/pulls/7")) {
    return jsonResponse({ ...readyPullRequest, merged: false });
  }

  if (url.includes("/check-runs")) {
    return jsonResponse({
      check_runs: [{ conclusion: "success", status: "completed" }],
    });
  }

  throw new Error(`Unexpected GitHub request: ${url}`);
};

const createBuiltinMalformedCiFetchStub = (): typeof fetch => async (input) => {
  const url = getRequestUrl(input);

  if (url.includes("/pulls/7")) {
    return jsonResponse({ ...readyPullRequest, merged: false });
  }

  if (url.includes("/check-runs")) {
    return jsonResponse({ items: [] });
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
  test("shared GitHub headers support JSON adapter requests", () => {
    expect(buildHeaders("github-token")).toEqual({
      Accept: "application/vnd.github+json",
      Authorization: "Bearer github-token",
      "Content-Type": "application/json",
      "X-GitHub-Api-Version": "2022-11-28",
    });
  });

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
    test(`${adapterCase.adapter.name} completes when linked PR checks pass`, async () => {
      vi.stubGlobal("fetch", createPassedCiFetchStub());

      const result = await adapterCase.adapter.getStatus(
        adapterCase.externalRef,
        adapterCase.credentials
      );

      expect(result.status).toBe("completed");
      expect(result.ciStatus).toBe("passed");
      expect(result.prNumber).toBe(7);
      expect(result.prUrl).toBe(pullRequest.html_url);
    });
  }

  for (const adapterCase of adapterCases) {
    test(`${adapterCase.adapter.name} polls CI with the PR head SHA`, async () => {
      const requestedUrls: string[] = [];
      vi.stubGlobal("fetch", (async (input) => {
        requestedUrls.push(getRequestUrl(input));
        return createPassedCiFetchStub()(input);
      }) satisfies typeof fetch);

      await adapterCase.adapter.getStatus(
        adapterCase.externalRef,
        adapterCase.credentials
      );

      expect(
        requestedUrls.some((url) =>
          url.includes("/commits/head-sha/check-runs")
        )
      ).toBe(true);
      expect(
        requestedUrls.some((url) =>
          url.includes("/commits/feature/branch-with-slash/check-runs")
        )
      ).toBe(false);
    });
  }

  test("copilot keeps polling when linked PR checks pass but the PR is still draft", async () => {
    vi.stubGlobal("fetch", createPassedCiFetchStub(pullRequest));

    const result = await copilotAdapter.getStatus("copilot:acme/reflet#42", {
      githubPat: "github-token",
    });

    expect(result.status).toBe("running");
    expect(result.ciStatus).toBe("passed");
    expect(result.prNumber).toBe(7);
  });

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
      expect(result.activityLogs[0]?.details).not.toContain("ghp_secret");
      expect(result.activityLogs[0]?.details).not.toContain("Bad credentials");
    });
  }

  for (const adapterCase of adapterCases) {
    test(`${adapterCase.adapter.name} hides provider response bodies on delegation failure`, async () => {
      vi.stubGlobal("fetch", createIssueCreationFailureFetchStub());

      const result = await adapterCase.adapter.executeTask(
        {
          acceptanceCriteria: ["A PR is opened"],
          agentsMdContent: "Follow project rules.",
          baseBranch: "main",
          featureBranch: "autopilot/test-task",
          repoUrl: "https://github.com/acme/reflet",
          technicalSpec: "Implement the task.",
          title: "Test task",
        },
        adapterCase.credentials
      );

      expect(result.status).toBe("failed");
      expect(result.errorMessage).toContain("401");
      expect(result.errorMessage).not.toContain("ghp_secret");
      expect(result.errorMessage).not.toContain("Bad credentials");
      expect(
        result.activityLogs.some(
          (entry) =>
            entry.level === "error" &&
            entry.message.includes("delegation failed") &&
            !entry.message.includes("ghp_secret") &&
            !entry.message.includes("Bad credentials")
        )
      ).toBe(true);
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

  for (const adapterCase of adapterCases) {
    test(`${adapterCase.adapter.name} keeps polling when closed PR merge lookup fails`, async () => {
      vi.stubGlobal("fetch", createClosedMergeLookupFailurePrFetchStub());

      const result = await adapterCase.adapter.getStatus(
        adapterCase.externalRef,
        adapterCase.credentials
      );

      expect(result.status).toBe("running");
      expect(result.merged).toBeUndefined();
      expect(
        result.activityLogs.some(
          (entry) =>
            entry.level === "warning" &&
            entry.message.includes("Could not check PR merge status")
        )
      ).toBe(true);
    });
  }

  for (const adapterCase of adapterCases) {
    test(`${adapterCase.adapter.name} fails when a linked PR is closed without merge`, async () => {
      vi.stubGlobal("fetch", createClosedUnmergedPrFetchStub());

      const result = await adapterCase.adapter.getStatus(
        adapterCase.externalRef,
        adapterCase.credentials
      );

      expect(result.status).toBe("failed");
      expect(result.merged).toBe(false);
      expect(result.prNumber).toBe(7);
      const [lastLog] = result.activityLogs.slice(-1);
      expect(lastLog?.message).toContain("closed without merge");
    });
  }

  test("built-in adapter fails when its PR is closed without merge", async () => {
    vi.stubGlobal("fetch", createBuiltinClosedUnmergedPrFetchStub());

    const result = await builtinAdapter.getStatus("builtin:acme/reflet#7", {
      githubToken: "github-token",
    });

    expect(result.status).toBe("failed");
    expect(result.merged).toBe(false);
    expect(result.prNumber).toBe(7);
    const [lastLog] = result.activityLogs.slice(-1);
    expect(lastLog?.message).toContain("closed without merge");
  });

  test("built-in adapter keeps polling when PR lookup fails", async () => {
    vi.stubGlobal("fetch", createBuiltinPrLookupFailureFetchStub());

    const result = await builtinAdapter.getStatus("builtin:acme/reflet#7", {
      githubToken: "github-token",
    });

    expect(result.status).toBe("running");
    expect(
      result.activityLogs.some(
        (entry) =>
          entry.level === "warning" &&
          entry.message.includes("Could not check PR status for Built-in") &&
          !entry.details?.includes("ghp_secret") &&
          !entry.details?.includes("Bad credentials")
      )
    ).toBe(true);
  });

  test("built-in adapter polls CI with the PR head SHA", async () => {
    const requestedUrls: string[] = [];
    vi.stubGlobal("fetch", (async (input) => {
      requestedUrls.push(getRequestUrl(input));
      return createBuiltinPassedCiFetchStub()(input);
    }) satisfies typeof fetch);

    const result = await builtinAdapter.getStatus("builtin:acme/reflet#7", {
      githubToken: "github-token",
    });

    expect(result.status).toBe("completed");
    expect(
      requestedUrls.some((url) => url.includes("/commits/head-sha/check-runs"))
    ).toBe(true);
    expect(
      requestedUrls.some((url) =>
        url.includes("/commits/feature/branch-with-slash/check-runs")
      )
    ).toBe(false);
  });

  test("built-in adapter keeps polling when GitHub returns malformed CI data", async () => {
    vi.stubGlobal("fetch", createBuiltinMalformedCiFetchStub());

    const result = await builtinAdapter.getStatus("builtin:acme/reflet#7", {
      githubToken: "github-token",
    });

    expect(result.status).toBe("running");
    expect(result.prNumber).toBe(7);
    expect(result.prUrl).toBe(readyPullRequest.html_url);
    expect(
      result.activityLogs.some(
        (entry) =>
          entry.level === "warning" &&
          entry.message.includes("Could not parse check runs response")
      )
    ).toBe(true);
  });

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
