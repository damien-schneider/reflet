/// <reference types="vite/client" />
import { describe, expect, test } from "vitest";
import { api } from "../../../_generated/api";
import { seedOrganization } from "../../../test.fixtures";
import { setupTest } from "../../../test.helpers";

const OWNER = { _id: "user_owner", email: "owner@acme.app" };
const MEMBER = { _id: "user_member", email: "member@acme.app" };

const setup = async (stripeSubscriptionStatus: string | null = "active") => {
  const t = setupTest({
    authUsers: [OWNER, MEMBER],
    stripeSubscriptionStatus,
  });
  const seedOrg = (slug: string) =>
    t.run(async (ctx) => {
      const orgId = await seedOrganization(ctx, { name: slug, slug });
      await ctx.db.insert("organizationMembers", {
        createdAt: Date.now(),
        organizationId: orgId,
        role: "owner",
        userId: OWNER._id,
      });
      await ctx.db.insert("organizationMembers", {
        createdAt: Date.now(),
        organizationId: orgId,
        role: "member",
        userId: MEMBER._id,
      });
      return orgId;
    });
  const organizationId = await seedOrg("acme");
  const as = (user: { _id: string }) =>
    t.withIdentity({ sessionId: user._id, subject: user._id });
  return { as, organizationId, seedOrg, t };
};

const domainArgs = { domain: "support.acme.com", fromLocalPart: "help" };

describe("support sending domain", () => {
  test("a free organization is told the feature is Pro", async () => {
    const { as, organizationId } = await setup(null);
    await expect(
      as(OWNER).mutation(api.support.email.domains.mutations.addSendingDomain, {
        ...domainArgs,
        organizationId,
      })
    ).rejects.toThrow("Sending from your own domain is a Pro feature.");
  });

  test.each([
    ["a reflet.app subdomain", "support.reflet.app", "help", "reflet.app"],
    ["a root domain", "acme.com", "help", "dedicated subdomain"],
    ["an invalid sender name", "support.acme.com", "Help Desk!", "sender name"],
  ])("%s is rejected", async (_label, domain, fromLocalPart, message) => {
    const { as, organizationId } = await setup();
    await expect(
      as(OWNER).mutation(api.support.email.domains.mutations.addSendingDomain, {
        domain,
        fromLocalPart,
        organizationId,
      })
    ).rejects.toThrow(message);
  });

  test("a domain used by another organization is rejected", async () => {
    const { as, organizationId, seedOrg } = await setup();
    const otherOrgId = await seedOrg("other");
    const owner = as(OWNER);
    await owner.mutation(api.support.email.domains.mutations.addSendingDomain, {
      ...domainArgs,
      organizationId,
    });
    await expect(
      owner.mutation(api.support.email.domains.mutations.addSendingDomain, {
        ...domainArgs,
        organizationId: otherOrgId,
      })
    ).rejects.toThrow("already used");
  });

  test("a non-admin member cannot add a domain", async () => {
    const { as, organizationId } = await setup();
    await expect(
      as(MEMBER).mutation(
        api.support.email.domains.mutations.addSendingDomain,
        {
          ...domainArgs,
          organizationId,
        }
      )
    ).rejects.toThrow("Only admins");
  });

  test("an added domain shows up pending in settings", async () => {
    const { as, organizationId } = await setup();
    const owner = as(OWNER);
    await owner.mutation(api.support.email.domains.mutations.addSendingDomain, {
      domain: "Support.Acme.com",
      fromLocalPart: "Help",
      organizationId,
    });
    const settings = await owner.query(api.support.email.settings.get, {
      organizationId,
    });
    expect(settings.isPro).toBe(true);
    expect(settings.domain).toMatchObject({
      domain: "support.acme.com",
      fromLocalPart: "help",
      status: "not_started",
    });
  });
});

describe("support forwarding settings", () => {
  test("creating the inbound alias twice returns the same address", async () => {
    const { as, organizationId } = await setup(null);
    const owner = as(OWNER);
    const first = await owner.mutation(
      api.support.email.settings.createInboundAlias,
      { organizationId }
    );
    const second = await owner.mutation(
      api.support.email.settings.createInboundAlias,
      { organizationId }
    );
    expect(second).toBe(first);
    expect(first).toMatch(/^acme-[0-9a-f]{8}$/);
    const settings = await owner.query(api.support.email.settings.get, {
      organizationId,
    });
    expect(settings.inboundAddress).toBe(`${first}@inbox.reflet.app`);
  });

  test("changing the forwarding address resets its verification", async () => {
    const { as, organizationId, t } = await setup(null);
    const owner = as(OWNER);
    await owner.mutation(api.support.email.settings.createInboundAlias, {
      organizationId,
    });
    await t.run(async (ctx) => {
      const settings = await ctx.db
        .query("supportEmailSettings")
        .withIndex("by_organization", (q) =>
          q.eq("organizationId", organizationId)
        )
        .unique();
      if (settings) {
        await ctx.db.patch(settings._id, {
          forwardingAddress: "old@acme.app",
          forwardingVerifiedAt: Date.now(),
        });
      }
    });

    await owner.mutation(api.support.email.settings.setForwardingAddress, {
      address: "Help@Acme.app",
      organizationId,
    });

    const settings = await owner.query(api.support.email.settings.get, {
      organizationId,
    });
    expect(settings.forwardingAddress).toBe("help@acme.app");
    expect(settings.forwardingVerifiedAt).toBeUndefined();
  });

  test("an invalid forwarding address is rejected", async () => {
    const { as, organizationId } = await setup(null);
    await expect(
      as(OWNER).mutation(api.support.email.settings.setForwardingAddress, {
        address: "not-an-email",
        organizationId,
      })
    ).rejects.toThrow("valid email");
  });

  test("a Reflet inbound address cannot be the forwarding mailbox", async () => {
    const { as, organizationId } = await setup(null);
    await expect(
      as(OWNER).mutation(api.support.email.settings.setForwardingAddress, {
        address: "acme-1234abcd@inbox.reflet.app",
        organizationId,
      })
    ).rejects.toThrow("not a Reflet address");
  });
});
