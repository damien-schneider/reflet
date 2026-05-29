/// <reference types="vite/client" />

import { convexTest, type TestConvex } from "convex-test";
import { describe, expect, test } from "vitest";
import { internal } from "../../../_generated/api";
import schema from "../../../schema";
import { modules } from "../../../test.helpers";

const REPO = "acme/reflet-demo";

type TestContext = TestConvex<typeof schema>;

const createOrg = async (t: TestContext) =>
  t.run((ctx) =>
    ctx.db.insert("organizations", {
      name: "Harness Org",
      slug: "harness-org",
      isPublic: false,
      subscriptionTier: "pro",
      subscriptionStatus: "active",
      createdAt: Date.now(),
    })
  );

describe("repo-native harness bridge lifecycle", () => {
  test("claims a product brain job and projects completed artifacts", async () => {
    const t = convexTest(schema, modules);
    const organizationId = await createOrg(t);

    const bridgeInstallationId = await t.mutation(
      internal.autopilot.harness.bridge.upsertBridgeForRepo,
      {
        organizationId,
        repoFullName: REPO,
        bridgeName: "Damien MacBook",
        claudeAvailable: true,
        doctorChecks: [{ label: "Claude Code", passed: true }],
      }
    );

    await t.mutation(internal.autopilot.harness.mutations.enqueueBridgeJob, {
      organizationId,
      repoFullName: REPO,
      recipeId: "product-brain",
      recipeVersion: 1,
      title: "Build Product Brain",
    });

    const claimed = await t.mutation(
      internal.autopilot.harness.bridge.claimNextBridgeJobForRepo,
      { bridgeInstallationId, organizationId, repoFullName: REPO }
    );

    expect(claimed?.recipeId).toBe("product-brain");
    expect(claimed?.worktreeBranch).toContain("reflet/product-brain/");

    if (!claimed) {
      throw new Error("Expected bridge job to be claimed");
    }

    await t.mutation(internal.autopilot.harness.bridge.appendBridgeJobEvent, {
      organizationId,
      jobId: claimed.id,
      level: "action",
      message: "Claude generated Product Brain",
    });

    await t.mutation(internal.autopilot.harness.bridge.completeBridgeJobRun, {
      jobId: claimed.id,
      organizationId,
      prUrl: "https://github.com/acme/reflet-demo/pull/1",
      claudeSessionId: "claude-session",
      commitSha: "commit-sha",
      promptHash: "prompt_123",
      runtimeMs: 1200,
      artifacts: [
        {
          artifactKind: "product_brain",
          downstreamInvalidations: [],
          evidenceHashes: { "README.md": "evidence-hash" },
          inputArtifactHashes: { "README.md": "input-hash" },
          outputHash: "out_123",
          path: ".reflet/strategy/product-brain.md",
          promptHash: "prompt_123",
          recipeId: "product-brain",
          recipeVersion: 1,
          title: "Product Brain",
          validationScore: 92,
          validationStatus: "passed",
          validatorMessages: ["Validated by Reflet Bridge"],
        },
      ],
    });

    const overview = await t.query(
      internal.autopilot.harness.queries.getHarnessOverviewInternal,
      { organizationId }
    );

    expect(overview.bridge?.status).toBe("online");
    expect(overview.recipes.map((recipe) => recipe.id)).toContain(
      "product-brain"
    );
    expect(overview.jobs[0]?.status).toBe("succeeded");
    expect(overview.jobs[0]?.prUrl).toBe(
      "https://github.com/acme/reflet-demo/pull/1"
    );
    expect(overview.artifacts[0]?.path).toBe(
      ".reflet/strategy/product-brain.md"
    );
    expect(overview.events[0]?.message).toBe("Claude generated Product Brain");
  });

  test("claims only jobs matching the bridge repo and records rich completion metadata", async () => {
    const t = convexTest(schema, modules);
    const organizationId = await createOrg(t);

    const bridgeInstallationId = await t.mutation(
      internal.autopilot.harness.bridge.upsertBridgeForRepo,
      {
        organizationId,
        repoFullName: REPO,
        bridgeName: "Damien MacBook",
        claudeAvailable: true,
        doctorChecks: [{ label: "Claude Code", passed: true }],
      }
    );

    await t.mutation(internal.autopilot.harness.mutations.enqueueBridgeJob, {
      organizationId,
      repoFullName: "other/repo",
      recipeId: "product-brain",
      recipeVersion: 1,
      title: "Wrong repo",
    });
    await t.mutation(internal.autopilot.harness.mutations.enqueueBridgeJob, {
      organizationId,
      repoFullName: REPO,
      recipeId: "product-brain",
      recipeVersion: 1,
      title: "Build Product Brain",
    });

    const claimed = await t.mutation(
      internal.autopilot.harness.bridge.claimNextBridgeJobForRepo,
      { bridgeInstallationId, organizationId, repoFullName: REPO }
    );

    expect(claimed?.title).toBe("Build Product Brain");
    if (!claimed) {
      throw new Error("Expected repo-scoped bridge job");
    }

    await t.mutation(internal.autopilot.harness.bridge.completeBridgeJobRun, {
      artifacts: [
        {
          artifactKind: "product_brain",
          downstreamInvalidations: [],
          evidenceHashes: { "README.md": "evidence-hash" },
          inputArtifactHashes: { "README.md": "input-hash" },
          outputHash: "out_456",
          path: ".reflet/strategy/product-brain.md",
          promptHash: "prompt_456",
          recipeId: "product-brain",
          recipeVersion: 1,
          title: "Product Brain",
          validationScore: 100,
          validationStatus: "passed",
          validatorMessages: ["Validated by Reflet Bridge"],
        },
      ],
      claudeSessionId: "claude-session",
      commitSha: "commit-sha",
      jobId: claimed.id,
      organizationId,
      prUrl: "https://github.com/acme/reflet-demo/pull/2",
      promptHash: "prompt_456",
      runtimeMs: 1200,
    });

    const overview = await t.query(
      internal.autopilot.harness.queries.getHarnessOverviewInternal,
      { organizationId }
    );

    expect(overview.jobs[0]?.commitSha).toBe("commit-sha");
    expect(overview.artifacts[0]?.promptHash).toBe("prompt_456");
    expect(overview.artifacts[0]?.validatorMessages).toEqual([
      "Validated by Reflet Bridge",
    ]);
  });

  test("marks failed bridge jobs with an explicit blocker", async () => {
    const t = convexTest(schema, modules);
    const organizationId = await createOrg(t);
    const jobId = await t.mutation(
      internal.autopilot.harness.mutations.enqueueBridgeJob,
      {
        organizationId,
        repoFullName: REPO,
        recipeId: "product-brain",
        recipeVersion: 1,
        title: "Build Product Brain",
      }
    );

    await t.mutation(internal.autopilot.harness.bridge.failBridgeJobRun, {
      blockerMessage: "missing_draft_pr",
      failureReason: "missing_draft_pr",
      jobId,
      organizationId,
      runtimeMs: 500,
    });

    const overview = await t.query(
      internal.autopilot.harness.queries.getHarnessOverviewInternal,
      { organizationId }
    );

    expect(overview.jobs[0]?.status).toBe("blocked");
    expect(overview.jobs[0]?.blockerMessage).toBe("missing_draft_pr");
  });

  test("blocks a bridge when non-Claude doctor checks fail", async () => {
    const t = convexTest(schema, modules);
    const organizationId = await createOrg(t);

    const bridgeInstallationId = await t.mutation(
      internal.autopilot.harness.bridge.upsertBridgeForRepo,
      {
        organizationId,
        repoFullName: REPO,
        bridgeName: "Damien MacBook",
        claudeAvailable: true,
        doctorChecks: [
          { label: "Claude Code", passed: true },
          { label: "GitHub auth", passed: false },
        ],
      }
    );

    await t.mutation(internal.autopilot.harness.mutations.enqueueBridgeJob, {
      organizationId,
      repoFullName: REPO,
      recipeId: "product-brain",
      recipeVersion: 1,
      title: "Blocked by doctor",
    });

    const claimed = await t.mutation(
      internal.autopilot.harness.bridge.claimNextBridgeJobForRepo,
      { bridgeInstallationId, organizationId, repoFullName: REPO }
    );
    const overview = await t.query(
      internal.autopilot.harness.queries.getHarnessOverviewInternal,
      { organizationId }
    );

    expect(claimed).toBeNull();
    expect(overview.bridge?.claudeAvailable).toBe(true);
    expect(overview.bridge?.status).toBe("blocked");
  });

  test("blocks a bridge when the doctor report is empty", async () => {
    const t = convexTest(schema, modules);
    const organizationId = await createOrg(t);

    const bridgeInstallationId = await t.mutation(
      internal.autopilot.harness.bridge.upsertBridgeForRepo,
      {
        organizationId,
        repoFullName: REPO,
        bridgeName: "Damien MacBook",
        claudeAvailable: true,
        doctorChecks: [],
      }
    );

    await t.mutation(internal.autopilot.harness.mutations.enqueueBridgeJob, {
      organizationId,
      repoFullName: REPO,
      recipeId: "product-brain",
      recipeVersion: 1,
      title: "Blocked by empty doctor",
    });

    const claimed = await t.mutation(
      internal.autopilot.harness.bridge.claimNextBridgeJobForRepo,
      { bridgeInstallationId, organizationId, repoFullName: REPO }
    );
    const overview = await t.query(
      internal.autopilot.harness.queries.getHarnessOverviewInternal,
      { organizationId }
    );

    expect(claimed).toBeNull();
    expect(overview.bridge?.status).toBe("blocked");
  });

  test("does not claim more work when Reflet PR cap is reached", async () => {
    const t = convexTest(schema, modules);
    const organizationId = await createOrg(t);

    const bridgeInstallationId = await t.mutation(
      internal.autopilot.harness.bridge.upsertBridgeForRepo,
      {
        organizationId,
        repoFullName: REPO,
        bridgeName: "Damien MacBook",
        claudeAvailable: true,
        doctorChecks: [{ label: "Claude Code", passed: true }],
      }
    );

    for (const title of ["First", "Second", "Third"]) {
      const jobId = await t.mutation(
        internal.autopilot.harness.mutations.enqueueBridgeJob,
        {
          organizationId,
          repoFullName: REPO,
          recipeId: "product-brain",
          recipeVersion: 1,
          title,
        }
      );
      await t.mutation(internal.autopilot.harness.bridge.completeBridgeJobRun, {
        artifacts: [],
        claudeSessionId: null,
        commitSha: `${title}-sha`,
        jobId,
        organizationId,
        prUrl: `https://github.com/acme/reflet-demo/pull/${title}`,
        promptHash: `${title}-prompt`,
        runtimeMs: 10,
      });
    }

    await t.mutation(internal.autopilot.harness.mutations.enqueueBridgeJob, {
      organizationId,
      repoFullName: REPO,
      recipeId: "product-brain",
      recipeVersion: 1,
      title: "Blocked by PR cap",
    });

    const claimed = await t.mutation(
      internal.autopilot.harness.bridge.claimNextBridgeJobForRepo,
      { bridgeInstallationId, organizationId, repoFullName: REPO }
    );

    expect(claimed).toBeNull();
  });
});
