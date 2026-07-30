import type { convexTest } from "convex-test";

type TestCtx = ReturnType<typeof convexTest>;

export const createOrg = async (t: TestCtx) =>
  t.run(async (ctx) =>
    ctx.db.insert("organizations", {
      createdAt: Date.now(),
      isPublic: false,
      name: "Test Org",
      slug: "test-org",
      subscriptionStatus: "none",
      subscriptionTier: "free",
    })
  );

export const createFeedback = async (
  t: TestCtx,
  orgId: Awaited<ReturnType<typeof createOrg>>,
  title = "Test Feedback"
) =>
  t.run(async (ctx) =>
    ctx.db.insert("feedback", {
      commentCount: 0,
      createdAt: Date.now(),
      description: "Test description",
      isApproved: true,
      isPinned: false,
      organizationId: orgId,
      status: "open",
      title,
      updatedAt: Date.now(),
      voteCount: 0,
    })
  );
