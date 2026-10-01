import { expect, test } from "vitest";
import { api, internal } from "../../_generated/api";
import {
  applyRecordedTriage,
  seedFeedback,
  seedOrganization,
} from "../../test.fixtures";
import { setupTest } from "../../test.helpers";

const admin = { _id: "admin", email: "admin@test.example", name: "Admin" };

test("removing an AI tag persists the refusal; explicitly readding makes it human-owned", async () => {
  const t = setupTest({ authUsers: [admin] });
  const { feedbackId, tagId } = await t.run(async (ctx) => {
    const organizationId = await seedOrganization(ctx);
    await ctx.db.insert("organizationMembers", {
      createdAt: Date.now(),
      organizationId,
      role: "admin",
      userId: admin._id,
    });
    const feedbackId = await seedFeedback(ctx, organizationId);
    const tagId = await ctx.db.insert("tags", {
      color: "red",
      createdAt: Date.now(),
      name: "Bug",
      organizationId,
      slug: "bug",
    });
    return { feedbackId, tagId };
  });
  const member = t.withIdentity({ sessionId: admin._id, subject: admin._id });
  await applyRecordedTriage(t, { feedbackId, tagIds: [tagId] });
  await member.mutation(api.feedback.tag_mutations.removeFromFeedback, {
    feedbackId,
    tagId,
  });
  await applyRecordedTriage(t, { feedbackId, tagIds: [tagId] });
  expect(await t.run((ctx) => ctx.db.query("feedbackTags").collect())).toEqual(
    []
  );
  await member.mutation(api.feedback.tag_mutations.addToFeedback, {
    feedbackId,
    tagId,
  });
  await applyRecordedTriage(t, { feedbackId, tagIds: [] });
  expect(
    await t.run((ctx) => ctx.db.query("feedbackTags").collect())
  ).toMatchObject([{ appliedByAi: false, tagId }]);
});

test("an API tag removal also survives recompute, and API confirmation removes AI provenance", async () => {
  const t = setupTest();
  const { organizationId, feedbackId, tagId } = await t.run(async (ctx) => {
    const organizationId = await seedOrganization(ctx);
    const feedbackId = await seedFeedback(ctx, organizationId);
    const tagId = await ctx.db.insert("tags", {
      color: "red",
      createdAt: Date.now(),
      name: "Bug",
      organizationId,
      slug: "bug",
    });
    return { feedbackId, organizationId, tagId };
  });
  await applyRecordedTriage(t, { feedbackId, tagIds: [tagId] });
  await t.mutation(internal.admin_api.feedback.updateFeedbackTags, {
    feedbackId,
    organizationId,
    removeTagIds: [tagId],
  });
  await applyRecordedTriage(t, { feedbackId, tagIds: [tagId] });
  expect(await t.run((ctx) => ctx.db.query("feedbackTags").collect())).toEqual(
    []
  );
  await t.mutation(internal.admin_api.feedback.updateFeedbackTags, {
    addTagIds: [tagId],
    feedbackId,
    organizationId,
  });
  await applyRecordedTriage(t, { feedbackId, tagIds: [] });
  expect(
    await t.run((ctx) => ctx.db.query("feedbackTags").collect())
  ).toMatchObject([{ appliedByAi: false, tagId }]);
});
