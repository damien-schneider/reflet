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
      internal.autopilot.harness.mutations.upsertBridgeInstallation,
      {
        organizationId,
        repoFullName: REPO,
        bridgeName: "Damien MacBook",
        claudeAvailable: true,
        bridgeOnline: true,
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
      internal.autopilot.harness.mutations.claimNextBridgeJob,
      { bridgeInstallationId }
    );

    expect(claimed?.recipeId).toBe("product-brain");
    expect(claimed?.worktreeBranch).toContain("reflet/product-brain/");

    if (!claimed) {
      throw new Error("Expected bridge job to be claimed");
    }

    await t.mutation(
      internal.autopilot.harness.mutations.appendBridgeRunEvent,
      {
        organizationId,
        jobId: claimed._id,
        level: "action",
        message: "Claude generated Product Brain",
      }
    );

    await t.mutation(internal.autopilot.harness.mutations.completeBridgeJob, {
      jobId: claimed._id,
      prUrl: "https://github.com/acme/reflet-demo/pull/1",
      artifacts: [
        {
          artifactKind: "product_brain",
          outputHash: "out_123",
          path: ".reflet/strategy/product-brain.md",
          recipeId: "product-brain",
          recipeVersion: 1,
          title: "Product Brain",
          validationScore: 92,
          validationStatus: "passed",
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
});
