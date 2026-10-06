import { ConvexError } from "convex/values";
import { describe, expect, it } from "vitest";
import { internal } from "../../_generated/api";
import { seedFeedback, seedOrganization } from "../../test.fixtures";
import { setupTest } from "../../test.helpers";

async function setup() {
  const t = setupTest();
  const seeded = await t.run(async (ctx) => {
    const organizationId = await seedOrganization(ctx);
    const externalUserId = await ctx.db.insert("externalUsers", {
      createdAt: Date.now(),
      externalId: "u1",
      lastSeenAt: Date.now(),
      organizationId,
      verified: true,
    });
    const pendingFeedbackId = await seedFeedback(ctx, organizationId, {
      isApproved: false,
    });
    return { externalUserId, organizationId, pendingFeedbackId };
  });
  const subscribe = (hasPrivateAccess: boolean) =>
    t.mutation(
      internal.feedback.api_public_write.subscribeFeedbackByOrganization,
      {
        externalUserId: seeded.externalUserId,
        feedbackId: seeded.pendingFeedbackId,
        hasPrivateAccess,
        organizationId: seeded.organizationId,
      }
    );
  return { subscribe };
}

describe("public API feedback actions", () => {
  it("hides unpublished feedback from publishable keys but not secret keys", async () => {
    const { subscribe } = await setup();

    await expect(subscribe(false)).rejects.toThrow(ConvexError);
    await expect(subscribe(true)).resolves.toMatchObject({ subscribed: true });
  });
});
