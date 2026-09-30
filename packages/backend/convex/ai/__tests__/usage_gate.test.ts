/// <reference types="vite/client" />

import { afterEach, describe, expect, test, vi } from "vitest";
import { api } from "../../_generated/api";
import { seedFeedback, seedOrganization } from "../../test.fixtures";
import { setupTest } from "../../test.helpers";

const ADMIN = { _id: "user_admin", email: "admin@example.com" };
const MEMBER = { _id: "user_member", email: "member@example.com" };
const OUTSIDER = { _id: "user_outsider", email: "outsider@example.com" };
const USER_HOURLY_CAPACITY = 20;

const setup = async () => {
  const t = setupTest({ authUsers: [ADMIN, MEMBER, OUTSIDER] });
  const { organizationId, releaseId } = await t.run(async (ctx) => {
    const orgId = await seedOrganization(ctx);
    for (const [userId, role] of [
      [ADMIN._id, "admin"],
      [MEMBER._id, "member"],
    ] as const) {
      await ctx.db.insert("organizationMembers", {
        createdAt: Date.now(),
        organizationId: orgId,
        role,
        userId,
      });
    }
    await seedFeedback(ctx, orgId, { isApproved: false });
    const release = await ctx.db.insert("releases", {
      createdAt: Date.now(),
      organizationId: orgId,
      title: "v1",
      updatedAt: Date.now(),
    });
    return { organizationId: orgId, releaseId: release };
  });
  const as = (user: { _id: string }) =>
    t.withIdentity({ sessionId: user._id, subject: user._id });
  const consumeAs = (user: { _id: string }) =>
    as(user).mutation(api.ai.usage_gate.consumeAiGeneration, {
      organizationId,
    });
  return { as, consumeAs, releaseId };
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("consumeAiGeneration", () => {
  test("rejects callers outside the organization and plain members", async () => {
    const { consumeAs } = await setup();

    await expect(consumeAs(OUTSIDER)).rejects.toThrow(
      "Only admins can use AI generation"
    );
    await expect(consumeAs(MEMBER)).rejects.toThrow(
      "Only admins can use AI generation"
    );
  });

  test("stops an admin once the per-user budget is spent", async () => {
    const { consumeAs } = await setup();

    for (let call = 0; call < USER_HOURLY_CAPACITY; call++) {
      await consumeAs(ADMIN);
    }

    await expect(consumeAs(ADMIN)).rejects.toThrow("RateLimited");
  });
});

describe("suggestLinkedFeedback", () => {
  test("refuses another organization's release before calling the model", async () => {
    const { as, releaseId } = await setup();
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    await expect(
      as(OUTSIDER).action(api.changelog.ai_matching.suggestLinkedFeedback, {
        releaseId,
      })
    ).rejects.toThrow("Only admins can use AI generation");
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
