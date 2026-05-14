import { describe, expect, it } from "vitest";
import {
  type ChainBlockerContext,
  type ChainStateLike,
  checkChainBlockers,
  type HealthState,
} from "../health_checks";

const emptyChain: ChainStateLike = {
  codebase_understanding: "missing",
  identity: "missing",
  brand_voice: "missing",
  feature_catalog: "missing",
  scope: "missing",
  market_analysis: "missing",
  target_definition: "missing",
  personas: "missing",
  use_cases: "missing",
  lead_targets: "missing",
  community_posts: "missing",
  drafts: "missing",
};

const publishedRoot: ChainStateLike = {
  ...emptyChain,
  codebase_understanding: "published",
};

const baseContext: ChainBlockerContext = {
  ctoEnabled: true,
  githubConnected: true,
  hasRepoAnalysis: true,
  lastBlockerLogAt: null,
  repoAnalysisError: null,
};

function fresh(): HealthState {
  return { status: "healthy", issues: [] };
}

describe("checkChainBlockers", () => {
  it("does not push any issue when root is published", () => {
    const state = fresh();
    checkChainBlockers(publishedRoot, baseContext, state);
    expect(state.status).toBe("healthy");
    expect(state.issues).toHaveLength(0);
  });

  it("does not push any issue when root is pending_review (already being produced)", () => {
    const state = fresh();
    checkChainBlockers(
      { ...emptyChain, codebase_understanding: "pending_review" },
      baseContext,
      state
    );
    expect(state.status).toBe("healthy");
    expect(state.issues).toHaveLength(0);
  });

  it("flags critical when no GitHub repo is connected", () => {
    const state = fresh();
    checkChainBlockers(
      emptyChain,
      { ...baseContext, githubConnected: false, hasRepoAnalysis: false },
      state
    );
    expect(state.status).toBe("critical");
    expect(state.issues).toHaveLength(1);
    const issue = state.issues[0];
    expect(issue.id).toBe("chain_blocked_no_github");
    expect(issue.severity).toBe("critical");
    expect(issue.actionLabel).toBe("Connect Repository");
    expect(issue.actionUrl).toBe("/settings/github");
  });

  it("flags critical when repo connected but no analysis yet", () => {
    const state = fresh();
    checkChainBlockers(
      emptyChain,
      { ...baseContext, hasRepoAnalysis: false },
      state
    );
    expect(state.status).toBe("critical");
    expect(state.issues).toHaveLength(1);
    const issue = state.issues[0];
    expect(issue.id).toBe("chain_blocked_no_repo_analysis");
    expect(issue.severity).toBe("critical");
    expect(issue.actionLabel).toBe("Run Repo Analysis");
  });

  it("surfaces the real analysis error message when one is provided", () => {
    const state = fresh();
    checkChainBlockers(
      emptyChain,
      {
        ...baseContext,
        hasRepoAnalysis: false,
        repoAnalysisError:
          "Deep analysis failed: openai/gpt-5.1-mini is not a valid model ID",
      },
      state
    );
    const issue = state.issues[0];
    expect(issue.message).toContain("openai/gpt-5.1-mini");
    expect(issue.resolution).toContain("retry automatically");
  });

  it("flags degraded when CTO disabled but chain root missing", () => {
    const state = fresh();
    checkChainBlockers(
      emptyChain,
      { ...baseContext, ctoEnabled: false },
      state
    );
    expect(state.status).toBe("degraded");
    expect(state.issues).toHaveLength(1);
    expect(state.issues[0].id).toBe("chain_blocked_cto_disabled");
    expect(state.issues[0].actionLabel).toBe("Enable CTO");
  });

  it("flags blocker-logged when an empty chain has a recent producer warning", () => {
    const state = fresh();
    checkChainBlockers(
      emptyChain,
      { ...baseContext, lastBlockerLogAt: Date.now() - 60_000 },
      state
    );
    expect(state.status).toBe("degraded");
    expect(state.issues).toHaveLength(1);
    expect(state.issues[0].id).toBe("chain_blocker_logged");
    expect(state.issues[0].actionLabel).toBe("View Activity");
  });

  it("ignores stale producer warnings older than the freshness window", () => {
    const state = fresh();
    const oldLog = Date.now() - 12 * 60 * 60 * 1000;
    checkChainBlockers(
      emptyChain,
      { ...baseContext, lastBlockerLogAt: oldLog },
      state
    );
    expect(state.status).toBe("healthy");
    expect(state.issues).toHaveLength(0);
  });

  it("does not double-flag once a higher-priority blocker fires", () => {
    const state = fresh();
    checkChainBlockers(
      emptyChain,
      {
        ctoEnabled: false,
        githubConnected: false,
        hasRepoAnalysis: false,
        lastBlockerLogAt: Date.now(),
      },
      state
    );
    expect(state.issues).toHaveLength(1);
    expect(state.issues[0].id).toBe("chain_blocked_no_github");
  });

  it("prepends the critical issue so it surfaces above other warnings", () => {
    const state: HealthState = {
      status: "degraded",
      issues: [
        {
          id: "few_agents",
          severity: "warning",
          message: "Only 2 of 6 agents enabled",
          resolution: "Enable more",
        },
      ],
    };
    checkChainBlockers(
      emptyChain,
      { ...baseContext, hasRepoAnalysis: false },
      state
    );
    expect(state.issues[0].id).toBe("chain_blocked_no_repo_analysis");
    expect(state.issues).toHaveLength(2);
  });
});
