import type { convexTest } from "convex-test";

type TestCtx = ReturnType<typeof convexTest>;

export const createOrg = async (t: TestCtx) =>
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

export const createFeedback = async (
  t: TestCtx,
  orgId: Awaited<ReturnType<typeof createOrg>>,
  title = "Test Feedback"
) =>
  t.run(async (ctx) =>
    ctx.db.insert("feedback", {
      organizationId: orgId,
      title,
      description: "Test description",
      status: "open",
      voteCount: 0,
      commentCount: 0,
      isApproved: true,
      isPinned: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    })
  );
