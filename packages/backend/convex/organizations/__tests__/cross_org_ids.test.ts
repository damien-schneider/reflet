/// <reference types="vite/client" />
import { expect, test } from "vitest";
import { api } from "../../_generated/api";
import type { MutationCtx } from "../../_generated/server";
import { seedFeedback, seedOrganization } from "../../test.fixtures";
import { setupTest } from "../../test.helpers";

const ATTACKER = { _id: "user_attacker", email: "mallory@evil.test" };
const VICTIM_OWNER = { _id: "user_victim", email: "owner@victim.test" };

const seedTenant = async (
  ctx: MutationCtx,
  options: { ownerId: string; slug: string }
) => {
  const now = Date.now();
  const organizationId = await seedOrganization(ctx, {
    slug: options.slug,
    stripeCustomerId: `cus_${options.slug}`,
  });
  await ctx.db.insert("organizationMembers", {
    createdAt: now,
    organizationId,
    role: "owner",
    userId: options.ownerId,
  });
  const milestoneId = await ctx.db.insert("milestones", {
    color: "gray",
    createdAt: now,
    isPublic: true,
    name: "Q1",
    order: 0,
    organizationId,
    status: "active",
    timeHorizon: "now",
    updatedAt: now,
  });
  const feedbackId = await seedFeedback(ctx, organizationId, {
    title: `${options.slug} private roadmap item`,
  });
  return { feedbackId, milestoneId, organizationId };
};

const setup = async () => {
  const t = setupTest({ authUsers: [ATTACKER, VICTIM_OWNER] });
  const tenants = await t.run(async (ctx) => ({
    attacker: await seedTenant(ctx, { ownerId: ATTACKER._id, slug: "evil" }),
    victim: await seedTenant(ctx, {
      ownerId: VICTIM_OWNER._id,
      slug: "victim",
    }),
  }));
  const mallory = t.withIdentity({
    sessionId: ATTACKER._id,
    subject: ATTACKER._id,
  });
  const victimOwner = t.withIdentity({
    sessionId: VICTIM_OWNER._id,
    subject: VICTIM_OWNER._id,
  });
  return {
    mallory,
    own: tenants.attacker,
    t,
    victim: tenants.victim,
    victimOwner,
  };
};

test("linking another org's feedback to an owned milestone is rejected", async () => {
  const { mallory, own, victim } = await setup();

  await expect(
    mallory.mutation(api.organizations.milestone_actions.addFeedback, {
      feedbackId: victim.feedbackId,
      milestoneId: own.milestoneId,
    })
  ).rejects.toThrow("Feedback not found");

  await mallory.mutation(api.organizations.milestone_actions.addFeedback, {
    feedbackId: own.feedbackId,
    milestoneId: own.milestoneId,
  });
  const milestone = await mallory.query(api.organizations.milestones.get, {
    id: own.milestoneId,
  });
  expect(milestone?.feedback.map((item) => item?._id)).toEqual([
    own.feedbackId,
  ]);
});

test("milestones.get never returns feedback of another org linked before the fix", async () => {
  const { mallory, own, t, victim } = await setup();
  await t.run((ctx) =>
    ctx.db.insert("milestoneFeedback", {
      addedAt: Date.now(),
      feedbackId: victim.feedbackId,
      milestoneId: own.milestoneId,
    })
  );

  const milestone = await mallory.query(api.organizations.milestones.get, {
    id: own.milestoneId,
  });
  expect(milestone?.feedback).toEqual([]);
});

test("non-members see only the public view of a public org", async () => {
  const { mallory, victimOwner } = await setup();

  const outsiderView = await mallory.query(
    api.organizations.queries.getBySlug,
    { slug: "victim" }
  );
  expect(outsiderView?.name).toBe("Acme");
  expect(outsiderView?.role).toBeNull();
  expect(outsiderView).not.toHaveProperty("stripeCustomerId");
  expect(outsiderView).not.toHaveProperty("subscriptionTier");
  expect(outsiderView).not.toHaveProperty("customDomain");

  const memberView = await victimOwner.query(
    api.organizations.queries.getBySlug,
    { slug: "victim" }
  );
  expect(memberView?.role).toBe("owner");
  expect(memberView).toHaveProperty("stripeCustomerId", "cus_victim");
});
