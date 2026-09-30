/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import { internal } from "../../_generated/api";
import schema from "../../schema";
import { modules } from "../../test.helpers";
import { createFeedback, createOrg } from "./test_helpers";

async function setup() {
  const t = convexTest(schema, modules);
  const victimOrgId = await createOrg(t);
  const attackerOrgId = await createOrg(t);
  const sourceFeedbackId = await createFeedback(t, victimOrgId, "Top request");
  const targetFeedbackId = await createFeedback(t, victimOrgId, "Other");
  const pairId = await t.run((ctx) =>
    ctx.db.insert("duplicatePairs", {
      detectedAt: Date.now(),
      feedbackIdA: sourceFeedbackId,
      feedbackIdB: targetFeedbackId,
      organizationId: victimOrgId,
      similarityScore: 0.9,
      status: "pending",
    })
  );
  return {
    attackerOrgId,
    pairId,
    sourceFeedbackId,
    t,
    targetFeedbackId,
    victimOrgId,
  };
}

describe("admin duplicates API org scoping", () => {
  test("another organization's key cannot resolve the pair", async () => {
    const { attackerOrgId, pairId, t } = await setup();

    await expect(
      t.mutation(internal.admin_api.duplicates.resolveDuplicate, {
        action: "reject",
        organizationId: attackerOrgId,
        pairId,
        resolvedBy: "api-admin",
      })
    ).rejects.toThrow("Duplicate pair not found");

    const pair = await t.run((ctx) => ctx.db.get(pairId));
    expect(pair?.status).toBe("pending");
  });

  test("another organization's key cannot merge the feedback", async () => {
    const { attackerOrgId, sourceFeedbackId, t, targetFeedbackId } =
      await setup();

    await expect(
      t.mutation(internal.admin_api.duplicates.mergeFeedback, {
        mergedBy: "api-admin",
        organizationId: attackerOrgId,
        sourceFeedbackId,
        targetFeedbackId,
      })
    ).rejects.toThrow("Feedback not found");

    const source = await t.run((ctx) => ctx.db.get(sourceFeedbackId));
    expect(source?.isMerged).toBeUndefined();
  });

  test("the owning organization merges and resolves the pair", async () => {
    const { pairId, sourceFeedbackId, t, targetFeedbackId, victimOrgId } =
      await setup();

    await t.mutation(internal.admin_api.duplicates.mergeFeedback, {
      mergedBy: "api-admin",
      organizationId: victimOrgId,
      pairId,
      sourceFeedbackId,
      targetFeedbackId,
    });

    const [source, pair] = await t.run(async (ctx) => [
      await ctx.db.get(sourceFeedbackId),
      await ctx.db.get(pairId),
    ]);
    expect(source).toMatchObject({
      isMerged: true,
      mergedIntoId: targetFeedbackId,
    });
    expect(pair?.status).toBe("merged");
  });
});
