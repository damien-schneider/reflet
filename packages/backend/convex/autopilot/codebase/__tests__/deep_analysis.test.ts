/// <reference types="vite/client" />
import { convexTest, type TestConvex } from "convex-test";
import { describe, expect, test } from "vitest";
import { internal } from "../../../_generated/api";
import type { Id } from "../../../_generated/dataModel";
import schema from "../../../schema";
import { modules } from "../../../test.helpers";
import type { DeepAnalysisDeps } from "../actions";
import { runDeepAnalysisCore } from "../actions";
import { createCodebaseAgent } from "../agent";
import {
  createFailingModel,
  createFakeOctokit,
  createScriptedModel,
} from "./mock_helpers";

type TestContext = TestConvex<typeof schema>;

const SYNTHESIS_BRIEF = `# Hello World

**Tagline:** A SaaS for testing repos

**One-liner:** Test product for ai pipelines.

## Identity
- **Category:** Test infra
- **Target audience:** Developers
- **Positioning:** "A SaaS for testing repos."
- **Differentiators:**
  - Mocked
  - Tested
  - Verified

## Brand Voice
> "Hello World"  *(— README.md)*

Voice is technical and concise.

## Feature Catalog

### Dashboard
- **What it does:** Lets users see metrics.
- **Capabilities:**
  - View counters
- **Where it lives:** /dashboard
- **Evidence:** README.md

## Integrations
- None

## User Model
- Individual

## Pricing & Plans
No pricing surfaces found in the codebase.

## Key User Flows
1. Sign up
2. Use dashboard

## Personas (inferred)
- **Solo dev:** Pain: testing
  - Why pick: simple

## Recently Shipped
- feat: initial setup (#1)
- feat: add dashboard (#2)

## Stack at a glance
TypeScript, Next.js
`;

async function setupOrgWithGithubConnection(
  t: TestContext,
  opts: { repoFullName?: string } = {}
): Promise<{
  analysisId: Id<"repoAnalysis">;
  organizationId: Id<"organizations">;
}> {
  const orgId = await t.run(async (ctx) =>
    ctx.db.insert("organizations", {
      name: "Test Org",
      slug: "test-org",
      isPublic: false,
      subscriptionTier: "free",
      subscriptionStatus: "none",
      createdAt: Date.now(),
    })
  );

  const repoFullName = opts.repoFullName ?? "octocat/hello-world";
  const now = Date.now();

  const connectionId = await t.run(async (ctx) =>
    ctx.db.insert("githubConnections", {
      organizationId: orgId,
      installationId: "inst_42",
      accountType: "organization",
      accountLogin: repoFullName.split("/")[0],
      status: "connected",
      repositoryId: "12345",
      repositoryFullName: repoFullName,
      createdAt: now,
      updatedAt: now,
    })
  );

  const analysisId = await t.run(async (ctx) =>
    ctx.db.insert("repoAnalysis", {
      organizationId: orgId,
      githubConnectionId: connectionId,
      status: "pending",
      createdAt: now,
      updatedAt: now,
    })
  );

  return { analysisId, organizationId: orgId };
}

function buildOverrides(opts: {
  exploreSteps: Parameters<typeof createScriptedModel>[0];
  octokitOpts?: Parameters<typeof createFakeOctokit>[0];
  synthesisBrief?: string;
  synthesisFails?: number;
}): Partial<DeepAnalysisDeps> {
  const fakeOctokit = createFakeOctokit(opts.octokitOpts);
  const exploreModel = createScriptedModel(opts.exploreSteps, "mock/explore");
  let synthesisAttempts = 0;
  const synthesisFails = opts.synthesisFails ?? 0;

  return {
    octokitFor: async () => fakeOctokit as never,
    agentForModel: () => createCodebaseAgent(exploreModel),
    exploreModels: ["mock/explore"],
    synthesisModelFor: () => {
      if (synthesisAttempts < synthesisFails) {
        synthesisAttempts++;
        return createFailingModel(
          "rate limit exceeded",
          "mock/synth-fail"
        ) as never;
      }
      synthesisAttempts++;
      return createScriptedModel(
        [{ text: opts.synthesisBrief ?? SYNTHESIS_BRIEF }],
        "mock/synth"
      ) as never;
    },
    synthesisModels:
      synthesisFails > 0 ? ["mock/fail", "mock/synth"] : ["mock/synth"],
  };
}

describe("runDeepAnalysisCore E2E", () => {
  test("happy path: explores -> synthesizes -> persists brief", async () => {
    const t = convexTest(schema, modules);
    const { analysisId, organizationId } =
      await setupOrgWithGithubConnection(t);

    await t.action(async (ctx) => {
      await runDeepAnalysisCore(
        ctx,
        { organizationId, analysisId },
        buildOverrides({
          exploreSteps: [
            {
              toolCalls: [
                { toolCallId: "c1", toolName: "get_repo_info", args: {} },
              ],
            },
            {
              toolCalls: [
                {
                  toolCallId: "c2",
                  toolName: "get_file_contents",
                  args: { path: "README.md" },
                },
              ],
            },
            {
              text: "Exploration complete. Found a SaaS for testing.",
            },
          ],
        })
      );
    });

    const analysis = await t.run((ctx) => ctx.db.get(analysisId));
    expect(analysis?.status).toBe("completed");
    expect(analysis?.productAnalysis).toBeDefined();
    expect(analysis?.productAnalysis?.length ?? 0).toBeGreaterThan(600);

    const run = await t.query(
      internal.autopilot.codebase.queries.getLatestRunForOrg,
      { organizationId }
    );
    expect(run?.status).toBe("completed");
    expect(run?.toolCallCount).toBeGreaterThan(0);
    expect(run?.assistantText?.length ?? 0).toBeGreaterThan(600);
    expect(run?.costUsd).toBeGreaterThanOrEqual(0);
  }, 30_000);

  test("fails analysis when github connection has no repo", async () => {
    const t = convexTest(schema, modules);
    const now = Date.now();
    const orgId = await t.run(async (ctx) =>
      ctx.db.insert("organizations", {
        name: "No GH Org",
        slug: "no-gh",
        isPublic: false,
        subscriptionTier: "free",
        subscriptionStatus: "none",
        createdAt: now,
      })
    );
    const connectionId = await t.run(async (ctx) =>
      ctx.db.insert("githubConnections", {
        organizationId: orgId,
        installationId: "inst_no_repo",
        accountType: "user",
        accountLogin: "no-repo-user",
        status: "connected",
        createdAt: now,
        updatedAt: now,
      })
    );
    const analysisId = await t.run(async (ctx) =>
      ctx.db.insert("repoAnalysis", {
        organizationId: orgId,
        githubConnectionId: connectionId,
        status: "pending",
        createdAt: now,
        updatedAt: now,
      })
    );

    await t.action(async (ctx) => {
      await runDeepAnalysisCore(ctx, {
        organizationId: orgId,
        analysisId,
      });
    });

    const analysis = await t.run((ctx) => ctx.db.get(analysisId));
    expect(analysis?.status).toBe("error");
    expect(analysis?.error).toContain("No GitHub connection");
  }, 15_000);

  test("fails analysis when synthesis brief is too short", async () => {
    const t = convexTest(schema, modules);
    const { analysisId, organizationId } =
      await setupOrgWithGithubConnection(t);

    await t.action(async (ctx) => {
      await runDeepAnalysisCore(
        ctx,
        { organizationId, analysisId },
        buildOverrides({
          exploreSteps: [
            {
              toolCalls: [
                { toolCallId: "c1", toolName: "get_repo_info", args: {} },
              ],
            },
            { text: "Done." },
          ],
          synthesisBrief: "too short",
        })
      );
    });

    const analysis = await t.run((ctx) => ctx.db.get(analysisId));
    expect(analysis?.status).toBe("error");
    expect(analysis?.error).toContain("too short");

    const run = await t.query(
      internal.autopilot.codebase.queries.getLatestRunForOrg,
      { organizationId }
    );
    expect(run?.status).toBe("failed");
  }, 20_000);

  test("synthesis fallback succeeds after first model rate-limits", async () => {
    const t = convexTest(schema, modules);
    const { analysisId, organizationId } =
      await setupOrgWithGithubConnection(t);

    await t.action(async (ctx) => {
      await runDeepAnalysisCore(
        ctx,
        { organizationId, analysisId },
        buildOverrides({
          exploreSteps: [
            {
              toolCalls: [
                { toolCallId: "c1", toolName: "get_repo_info", args: {} },
              ],
            },
            { text: "Done exploring." },
          ],
          synthesisFails: 1,
        })
      );
    });

    const analysis = await t.run((ctx) => ctx.db.get(analysisId));
    expect(analysis?.status).toBe("completed");
    expect(analysis?.productAnalysis?.length ?? 0).toBeGreaterThan(600);
  }, 30_000);
});
