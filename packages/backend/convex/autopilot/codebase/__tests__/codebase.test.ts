/// <reference types="vite/client" />
import { convexTest, type TestConvex } from "convex-test";
import { describe, expect, test } from "vitest";
import { internal } from "../../../_generated/api";
import schema from "../../../schema";
import { modules } from "../../../test.helpers";

type TestContext = TestConvex<typeof schema>;

const INSTALLATION_ID = "inst_42";
const REPO = "octocat/hello-world";

const createOrg = async (t: TestContext) =>
  t.run(async (ctx) =>
    ctx.db.insert("organizations", {
      name: "Test Org",
      slug: "test-org",
      isPublic: false,
      subscriptionTier: "free",
      subscriptionStatus: "none",
      createdAt: Date.now(),
    })
  );

describe("codebase schema + mutations", () => {
  test("cacheFile inserts then patches on duplicate key", async () => {
    const t = convexTest(schema, modules);

    await t.mutation(internal.autopilot.codebase.mutations.cacheFile, {
      installationId: INSTALLATION_ID,
      repoFullName: REPO,
      sha: "sha1",
      path: "README.md",
      content: "v1",
    });

    const first = await t.query(
      internal.autopilot.codebase.queries.getCachedFile,
      {
        installationId: INSTALLATION_ID,
        repoFullName: REPO,
        sha: "sha1",
        path: "README.md",
      }
    );
    expect(first?.content).toBe("v1");

    await t.mutation(internal.autopilot.codebase.mutations.cacheFile, {
      installationId: INSTALLATION_ID,
      repoFullName: REPO,
      sha: "sha1",
      path: "README.md",
      content: "v2",
    });

    const second = await t.query(
      internal.autopilot.codebase.queries.getCachedFile,
      {
        installationId: INSTALLATION_ID,
        repoFullName: REPO,
        sha: "sha1",
        path: "README.md",
      }
    );
    expect(second?.content).toBe("v2");

    const all = await t.run((ctx) =>
      ctx.db.query("codebaseFileCache").collect()
    );
    expect(all).toHaveLength(1);
  });

  test("upsertRepoMetadata creates then updates", async () => {
    const t = convexTest(schema, modules);

    await t.mutation(internal.autopilot.codebase.mutations.upsertRepoMetadata, {
      installationId: INSTALLATION_ID,
      repoFullName: REPO,
      languages: [{ name: "TypeScript", bytes: 1000 }],
      topics: ["saas"],
      defaultBranch: "main",
    });

    let meta = await t.query(
      internal.autopilot.codebase.queries.getRepoMetadata,
      { installationId: INSTALLATION_ID, repoFullName: REPO }
    );
    expect(meta?.defaultBranch).toBe("main");
    expect(meta?.topics).toEqual(["saas"]);

    await t.mutation(internal.autopilot.codebase.mutations.upsertRepoMetadata, {
      installationId: INSTALLATION_ID,
      repoFullName: REPO,
      languages: [{ name: "TypeScript", bytes: 2000 }],
      topics: ["saas", "ai"],
      defaultBranch: "develop",
    });

    meta = await t.query(internal.autopilot.codebase.queries.getRepoMetadata, {
      installationId: INSTALLATION_ID,
      repoFullName: REPO,
    });
    expect(meta?.defaultBranch).toBe("develop");
    expect(meta?.topics).toEqual(["saas", "ai"]);

    const all = await t.run((ctx) =>
      ctx.db.query("codebaseRepoMetadata").collect()
    );
    expect(all).toHaveLength(1);
  });

  test("agent run lifecycle: start -> increment -> complete", async () => {
    const t = convexTest(schema, modules);
    const orgId = await createOrg(t);

    const runId = await t.mutation(
      internal.autopilot.codebase.mutations.startAgentRun,
      {
        organizationId: orgId,
        repoFullName: REPO,
        purpose: "deep_analysis",
      }
    );

    await t.mutation(
      internal.autopilot.codebase.mutations.incrementToolCallCount,
      { runId, delta: 3 }
    );
    await t.mutation(
      internal.autopilot.codebase.mutations.incrementToolCallCount,
      { runId, delta: 2 }
    );

    await t.mutation(internal.autopilot.codebase.mutations.completeAgentRun, {
      runId,
      assistantText: "brief content",
      inputTokens: 100,
      outputTokens: 200,
      costUsd: 0.05,
    });

    const latest = await t.query(
      internal.autopilot.codebase.queries.getLatestRunForOrg,
      { organizationId: orgId }
    );
    expect(latest?.status).toBe("completed");
    expect(latest?.toolCallCount).toBe(5);
    expect(latest?.assistantText).toBe("brief content");
    expect(latest?.costUsd).toBe(0.05);
    expect(latest?.finishedAt).toBeDefined();
  });

  test("failAgentRun marks failed with error", async () => {
    const t = convexTest(schema, modules);
    const orgId = await createOrg(t);

    const runId = await t.mutation(
      internal.autopilot.codebase.mutations.startAgentRun,
      {
        organizationId: orgId,
        repoFullName: REPO,
        purpose: "deep_analysis",
      }
    );

    await t.mutation(internal.autopilot.codebase.mutations.failAgentRun, {
      runId,
      error: "rate limit exceeded",
    });

    const latest = await t.query(
      internal.autopilot.codebase.queries.getLatestRunForOrg,
      { organizationId: orgId }
    );
    expect(latest?.status).toBe("failed");
    expect(latest?.error).toBe("rate limit exceeded");
  });

  test("purgeStaleFileCache removes old entries", async () => {
    const t = convexTest(schema, modules);

    const oldTime = Date.now() - 30 * 24 * 60 * 60 * 1000;
    await t.run((ctx) =>
      ctx.db.insert("codebaseFileCache", {
        installationId: INSTALLATION_ID,
        repoFullName: REPO,
        sha: "old",
        path: "old.md",
        content: "stale",
        fetchedAt: oldTime,
      })
    );
    await t.mutation(internal.autopilot.codebase.mutations.cacheFile, {
      installationId: INSTALLATION_ID,
      repoFullName: REPO,
      sha: "fresh",
      path: "fresh.md",
      content: "new",
    });

    const removed = await t.mutation(
      internal.autopilot.codebase.mutations.purgeStaleFileCache,
      {}
    );
    expect(removed).toBe(1);

    const remaining = await t.run((ctx) =>
      ctx.db.query("codebaseFileCache").collect()
    );
    expect(remaining).toHaveLength(1);
    expect(remaining[0].sha).toBe("fresh");
  });
});
