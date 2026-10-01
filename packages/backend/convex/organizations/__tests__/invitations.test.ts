/// <reference types="vite/client" />
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { api } from "../../_generated/api";
import { seedOrganization } from "../../test.fixtures";
import { setupTest } from "../../test.helpers";

const OWNER = { _id: "user_owner", email: "owner@acme.test" };
const ADMIN = { _id: "user_admin", email: "admin@acme.test" };
const INVITEE = {
  _id: "user_invitee",
  email: "Invitee@Acme.test",
  emailVerified: true,
};
const LINK_HOLDER = {
  _id: "user_holder",
  email: "holder@else.test",
  emailVerified: true,
};
const INVITATION_BURST = 20;

const setup = async (stripeSubscriptionStatus: string | null = "active") => {
  const t = setupTest({
    authUsers: [OWNER, ADMIN, INVITEE, LINK_HOLDER],
    stripeSubscriptionStatus,
  });
  const organizationId = await t.run(async (ctx) => {
    const orgId = await seedOrganization(ctx);
    for (const [user, role] of [
      [OWNER, "owner"],
      [ADMIN, "admin"],
    ] as const) {
      await ctx.db.insert("organizationMembers", {
        createdAt: Date.now(),
        organizationId: orgId,
        role,
        userId: user._id,
      });
    }
    return orgId;
  });
  const as = (userId: string) =>
    t.withIdentity({ sessionId: userId, subject: userId });
  return { as, organizationId, t };
};

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

test("only the invited address can accept an invitation", async () => {
  const { as, organizationId, t } = await setup();
  const { token } = await as(OWNER._id).mutation(
    api.organizations.invitations.create,
    { email: "invitee@acme.test", organizationId, role: "admin" }
  );

  await expect(
    as(LINK_HOLDER._id).mutation(api.organizations.invitation_actions.accept, {
      token,
    })
  ).rejects.toThrow("This invitation was sent to a different email address");

  await as(INVITEE._id).mutation(api.organizations.invitation_actions.accept, {
    token,
  });
  const roles = await t.run(async (ctx) => {
    const members = await ctx.db
      .query("organizationMembers")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", organizationId)
      )
      .collect();
    return Object.fromEntries(members.map((m) => [m.userId, m.role]));
  });
  expect(roles[INVITEE._id]).toBe("admin");
  expect(roles[LINK_HOLDER._id]).toBeUndefined();
});

test("an admin cannot invite another admin, only members", async () => {
  const { as, organizationId } = await setup();
  const admin = as(ADMIN._id);

  await expect(
    admin.mutation(api.organizations.invitations.create, {
      email: "sock@puppet.test",
      organizationId,
      role: "admin",
    })
  ).rejects.toThrow("Only the owner can invite admins");

  const invite = await admin.mutation(api.organizations.invitations.create, {
    email: "member@new.test",
    organizationId,
    role: "member",
  });
  expect(invite.token).toBeTruthy();
});

test("cancelling invitations does not refill the invitation email budget", async () => {
  const { as, organizationId } = await setup();
  const owner = as(OWNER._id);

  for (let index = 0; index < INVITATION_BURST; index++) {
    const { invitationId } = await owner.mutation(
      api.organizations.invitations.create,
      { email: `target${index}@spam.test`, organizationId, role: "member" }
    );
    await owner.mutation(api.organizations.invitation_actions.cancel, {
      invitationId,
    });
  }

  await expect(
    owner.mutation(api.organizations.invitations.create, {
      email: "one-more@spam.test",
      organizationId,
      role: "member",
    })
  ).rejects.toThrow("RateLimited");
});

test("a paying org invites past the free member limit", async () => {
  const { as, organizationId } = await setup("active");
  const owner = as(OWNER._id);

  for (const email of ["third@acme.test", "fourth@acme.test"]) {
    await owner.mutation(api.organizations.invitations.create, {
      email,
      organizationId,
      role: "member",
    });
  }
});

test("a free org stops at three members including pending invitations", async () => {
  const { as, organizationId } = await setup(null);
  const owner = as(OWNER._id);
  await owner.mutation(api.organizations.invitations.create, {
    email: "third@acme.test",
    organizationId,
    role: "member",
  });

  await expect(
    owner.mutation(api.organizations.invitations.create, {
      email: "fourth@acme.test",
      organizationId,
      role: "member",
    })
  ).rejects.toThrow("Member limit reached. Your free plan allows 3 members.");
});
