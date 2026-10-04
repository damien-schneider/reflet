/// <reference types="vite/client" />
import { expect, test } from "vitest";
import { api } from "../../_generated/api";
import type { Id } from "../../_generated/dataModel";
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
  const statusIds: Id<"organizationStatuses">[] = [];
  for (const [order, [name, semanticStatus]] of (
    [
      ["Backlog", "open"],
      ["Done", "completed"],
    ] as const
  ).entries()) {
    statusIds.push(
      await ctx.db.insert("organizationStatuses", {
        color: "#000000",
        createdAt: now,
        name,
        order,
        organizationId,
        semanticStatus,
        updatedAt: now,
      })
    );
  }
  const milestoneId = await ctx.db.insert("milestones", {
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
  const feedbackId = await seedFeedback(ctx, organizationId, {
    title: `${options.slug} private roadmap item`,
  });
  return { feedbackId, milestoneId, organizationId, statusIds };
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

test("status reorder rejects status ids from another org", async () => {
  const { mallory, own, t, victim, victimOwner } = await setup();

  await expect(
    mallory.mutation(api.organizations.status_mutations.reorder, {
      organizationId: own.organizationId,
      statusIds: [...victim.statusIds].reverse(),
    })
  ).rejects.toThrow("Status not found");
  const victimOrders = await t.run(async (ctx) =>
    Promise.all(
      victim.statusIds.map(async (id) => (await ctx.db.get(id))?.order)
    )
  );
  expect(victimOrders).toEqual([0, 1]);

  await victimOwner.mutation(api.organizations.status_mutations.reorder, {
    organizationId: victim.organizationId,
    statusIds: [...victim.statusIds].reverse(),
  });
  const reordered = await t.run(async (ctx) =>
    Promise.all(
      victim.statusIds.map(async (id) => (await ctx.db.get(id))?.order)
    )
  );
  expect(reordered).toEqual([1, 0]);
});

test("milestone reorder rejects milestones of another org behind an owned first id", async () => {
  const { mallory, own, t, victim } = await setup();

  await expect(
    mallory.mutation(api.organizations.milestone_actions.reorder, {
      milestoneIds: [own.milestoneId, victim.milestoneId],
    })
  ).rejects.toThrow("Milestone not found");
  const victimMilestone = await t.run((ctx) => ctx.db.get(victim.milestoneId));
  expect(victimMilestone?.order).toBe(0);
});

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
