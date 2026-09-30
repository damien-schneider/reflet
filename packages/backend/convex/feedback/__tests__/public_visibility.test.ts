/// <reference types="vite/client" />
import { expect, test } from "vitest";
import { api } from "../../_generated/api";
import type { Id } from "../../_generated/dataModel";
import { setupTest } from "../../test.helpers";

const MEMBER = { _id: "user_member", email: "member@acme.test", name: "Mia" };
const OUTSIDER = { _id: "user_out", email: "out@else.test", name: "Otto" };

const seed = async (
  t: ReturnType<typeof setupTest>,
  isPublic: boolean
): Promise<{
  feedbackId: Id<"feedback">;
  organizationId: Id<"organizations">;
}> =>
  await t.run(async (ctx) => {
    const now = Date.now();
    const organizationId = await ctx.db.insert("organizations", {
      createdAt: now,
      isPublic,
      name: "Acme",
      slug: `acme-${isPublic}`,
      stripeCustomerId: "cus_secret",
      subscriptionStatus: "none",
      subscriptionTier: "free",
    });
    await ctx.db.insert("organizationMembers", {
      createdAt: now,
      organizationId,
      role: "admin",
      userId: MEMBER._id,
    });
    const feedbackId = await ctx.db.insert("feedback", {
      aiDraftReply: "internal draft",
      aiFeatureCheckEvidence: [
        { filePath: "src/secret.ts", relevance: "high", snippet: "API_KEY" },
      ],
      assigneeId: MEMBER._id,
      authorId: MEMBER._id,
      commentCount: 1,
      context: { url: "https://app.acme.test/billing?token=abc" },
      createdAt: now,
      description: "Roadmap item",
      isApproved: true,
      isPinned: false,
      organizationId,
      status: "planned",
      title: "Dark mode",
      updatedAt: now,
      voteCount: 3,
    });
    await ctx.db.insert("comments", {
      authorId: MEMBER._id,
      body: "On it",
      createdAt: now,
      feedbackId,
      isOfficial: false,
      updatedAt: now,
    });
    return { feedbackId, organizationId };
  });

const PRIVATE_KEYS = [
  "aiDraftReply",
  "aiFeatureCheckEvidence",
  "assigneeId",
  "authorId",
  "context",
];

test("an anonymous caller gets nothing from a private org's roadmap", async () => {
  const t = setupTest({ authUsers: [MEMBER] });
  const { feedbackId, organizationId } = await seed(t, false);

  expect(await t.query(api.feedback.roadmap.list, { organizationId })).toEqual(
    []
  );
  expect(
    await t.query(api.feedback.tags.getForFeedback, { feedbackId })
  ).toEqual([]);

  const member = t.withIdentity({ sessionId: MEMBER._id, subject: MEMBER._id });
  const own = await member.query(api.feedback.roadmap.list, {
    organizationId,
  });
  expect(own).toHaveLength(1);
  expect(own[0].context?.url).toContain("billing");
});

test("public queries hide private fields and emails from non-members", async () => {
  const t = setupTest({ authUsers: [MEMBER, OUTSIDER] });
  const { feedbackId, organizationId } = await seed(t, true);
  const outsider = t.withIdentity({
    sessionId: OUTSIDER._id,
    subject: OUTSIDER._id,
  });

  const lists = await Promise.all([
    outsider.query(api.feedback.roadmap.list, { organizationId }),
    outsider.query(api.feedback.list.listByOrganization, { organizationId }),
    outsider.query(api.feedback.list.listForRoadmapByOrganization, {
      organizationId,
    }),
    t.query(api.feedback.actions.listPublic, { organizationId }),
  ]);
  for (const items of lists) {
    expect(items).toHaveLength(1);
    for (const key of PRIVATE_KEYS) {
      expect(items[0]).not.toHaveProperty(key);
    }
  }

  const detail = await outsider.query(api.feedback.queries.get, {
    id: feedbackId,
  });
  for (const key of PRIVATE_KEYS) {
    expect(detail).not.toHaveProperty(key);
  }
  expect(detail?.author).toMatchObject({ name: MEMBER.name });
  expect(detail?.author?.email).toBeUndefined();
  expect(detail?.assignee).toBeNull();
  expect(detail?.organization).not.toHaveProperty("stripeCustomerId");

  const comments = await outsider.query(api.feedback.comments.list, {
    feedbackId,
  });
  expect(comments[0].author?.email).toBeUndefined();

  const member = t.withIdentity({ sessionId: MEMBER._id, subject: MEMBER._id });
  const memberDetail = await member.query(api.feedback.queries.get, {
    id: feedbackId,
  });
  expect(memberDetail?.author?.email).toBe(MEMBER.email);
  expect(memberDetail?.assignee?.email).toBe(MEMBER.email);
  expect(memberDetail?.aiDraftReply).toBe("internal draft");
});

test("comments on unapproved feedback stay hidden from non-members", async () => {
  const t = setupTest({ authUsers: [MEMBER] });
  const { feedbackId } = await seed(t, true);
  await t.run(async (ctx) => {
    await ctx.db.patch(feedbackId, { isApproved: false });
  });

  expect(await t.query(api.feedback.comments.list, { feedbackId })).toEqual([]);
});

const linkUnapprovedEverywhere = async (
  t: ReturnType<typeof setupTest>
): Promise<{
  feedbackId: Id<"feedback">;
  milestoneId: Id<"milestones">;
  organizationId: Id<"organizations">;
}> => {
  const { feedbackId, organizationId } = await seed(t, true);
  const milestoneId = await t.run(async (ctx) => {
    const now = Date.now();
    await ctx.db.patch(feedbackId, { isApproved: false });
    const releaseId = await ctx.db.insert("releases", {
      createdAt: now,
      organizationId,
      publishedAt: now,
      title: "v1",
      updatedAt: now,
    });
    await ctx.db.insert("releaseFeedback", {
      createdAt: now,
      feedbackId,
      releaseId,
    });
    const id = await ctx.db.insert("milestones", {
      color: "#000000",
      createdAt: now,
      isPublic: true,
      name: "Q1",
      order: 0,
      organizationId,
      status: "active",
      timeHorizon: "now",
      updatedAt: now,
    });
    await ctx.db.insert("milestoneFeedback", {
      addedAt: now,
      feedbackId,
      milestoneId: id,
    });
    return id;
  });
  return { feedbackId, milestoneId, organizationId };
};

test("unapproved linked feedback stays out of public changelog and milestones", async () => {
  const t = setupTest({ authUsers: [MEMBER] });
  const { milestoneId, organizationId } = await linkUnapprovedEverywhere(t);

  const releases = await t.query(api.changelog.queries.listPublished, {
    organizationId,
  });
  expect(releases[0].feedback).toEqual([]);
  const milestone = await t.query(api.organizations.milestones.get, {
    id: milestoneId,
  });
  expect(milestone?.feedback).toEqual([]);
  const milestones = await t.query(api.organizations.milestones.list, {
    organizationId,
  });
  expect(milestones[0].feedbackPreview).toEqual([]);

  const member = t.withIdentity({ sessionId: MEMBER._id, subject: MEMBER._id });
  const memberReleases = await member.query(
    api.changelog.queries.listPublished,
    { organizationId }
  );
  expect(memberReleases[0].feedback.map((item) => item.title)).toEqual([
    "Dark mode",
  ]);
  const memberMilestone = await member.query(api.organizations.milestones.get, {
    id: milestoneId,
  });
  expect(memberMilestone?.feedback).toHaveLength(1);
});

test("non-members cannot comment on or vote for unapproved feedback", async () => {
  const t = setupTest({ authUsers: [MEMBER, OUTSIDER] });
  const { feedbackId } = await seed(t, true);
  await t.run(async (ctx) => {
    await ctx.db.patch(feedbackId, { isApproved: false });
  });
  const outsider = t.withIdentity({
    sessionId: OUTSIDER._id,
    subject: OUTSIDER._id,
  });

  await expect(
    outsider.mutation(api.feedback.comments.create, {
      body: "hi",
      feedbackId,
    })
  ).rejects.toThrow("You don't have access to comment on this feedback");
  await expect(
    outsider.mutation(api.feedback.votes.toggle, {
      feedbackId,
      voteType: "upvote",
    })
  ).rejects.toThrow("You don't have access to vote on this feedback");

  const member = t.withIdentity({ sessionId: MEMBER._id, subject: MEMBER._id });
  await member.mutation(api.feedback.comments.create, {
    body: "internal note",
    feedbackId,
  });
  const feedback = await t.run((ctx) => ctx.db.get(feedbackId));
  expect(feedback?.commentCount).toBe(2);
});
